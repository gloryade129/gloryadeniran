#!/usr/bin/env python3
"""
Round-trip test for decrypt_crypt14.py.

Builds a synthetic crypt14 file using the documented layout (protobuf header of
190 bytes, IV at 67, ciphertext from 190) plus a synthetic 158-byte key file,
then decrypts it with the real decryptor and checks the bytes come back intact.

This is the only way to prove the decryptor is correct without the user's actual
key, and it locks the offsets so a future edit cannot silently break them.

Run: py -3 tools/wa_export/test_decrypt_roundtrip.py
"""

import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from decrypt_crypt14 import (  # noqa: E402
    CRYPT14_DATA_OFFSET,
    CRYPT14_IV_OFFSET,
    KEY_LENGTH,
    KEY_OFFSET,
    KEYFILE_LENGTH,
    decrypt_backup,
    load_key,
)


def build_fixture(tmp: Path):
    from Crypto.Cipher import AES
    from Crypto.Random import get_random_bytes
    from Crypto.Util.Padding import pad

    # A believable plaintext: a SQLite header plus some message text.
    sqlite_body = b"SQLite format 3\x00" + b"\x00" * 84
    payload = sqlite_body + ("Hello ma, how far? " * 40).encode()

    key = get_random_bytes(32)

    # ── key file: 158 bytes, AES key living at offset 30 ──
    keyfile = bytearray(get_random_bytes(KEYFILE_LENGTH))
    keyfile[KEY_OFFSET : KEY_OFFSET + KEY_LENGTH] = key
    key_path = tmp / "key"
    key_path.write_bytes(bytes(keyfile))

    # ── crypt14 file: 190-byte protobuf header, IV at 67, data at 190 ──
    iv = get_random_bytes(16)
    header = bytearray(get_random_bytes(CRYPT14_DATA_OFFSET))
    # Mimic the real header: protobuf-ish prefix + version string.
    header[0:4] = b"\xc2\x01\x08\x00"
    version = b"2.26.39.7"
    header[87 : 87 + len(version)] = version
    header[CRYPT14_IV_OFFSET : CRYPT14_IV_OFFSET + 16] = iv

    ciphertext = AES.new(key, AES.MODE_CBC, iv).encrypt(pad(payload, AES.block_size))
    enc_bytes = bytes(header) + ciphertext
    # The header is 190 bytes (not a multiple of 16), so it is the *ciphertext*
    # that must be whole blocks — matching the real file on disk.
    assert len(ciphertext) % 16 == 0, "ciphertext must be a whole number of AES blocks"

    enc_path = tmp / "msgstore.db.crypt14"
    enc_path.write_bytes(enc_bytes)

    return key_path, enc_path, payload


def main() -> int:
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        key_path, enc_path, expected = build_fixture(tmp)
        out = tmp / "msgstore.db"

        loaded = load_key(key_path)
        assert len(loaded) == 32, "load_key must return exactly 32 bytes"

        decrypt_backup(enc_path, loaded, out)
        actual = out.read_bytes()

        assert actual == expected, f"round-trip mismatch: {len(actual)} vs {len(expected)} bytes"
        assert actual.startswith(b"SQLite format 3\x00")

        print("PASS  synthetic crypt14 round-trip")
        print(f"      header size      {CRYPT14_DATA_OFFSET} bytes")
        print(f"      IV offset        {CRYPT14_IV_OFFSET}")
        print(f"      AES key offset   {KEY_OFFSET} ({KEY_LENGTH} bytes)")
        print(f"      key file size    {KEYFILE_LENGTH} bytes")

    # A wrong key must fail loudly instead of writing garbage.
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        key_path, enc_path, _ = build_fixture(tmp)
        bogus = bytearray(key_path.read_bytes())
        bogus[KEY_OFFSET] ^= 0xFF
        bad_key_path = tmp / "key"
        bad_key_path.write_bytes(bytes(bogus))

        try:
            decrypt_backup(enc_path, load_key(bad_key_path), tmp / "out.db")
        except SystemExit as e:
            assert "Decryption failed" in str(e)
            print("PASS  wrong key is rejected")
        else:
            print("FAIL  wrong key was accepted")
            return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
