# Stickers

Drop WhatsApp stickers here as `.webp` files and the bot will start answering
with them, the way a person does — a sticker after the right line, not instead
of it.

## Naming

Prefix the filename with the moment it belongs to, then `__`:

```
amen__hands-together.webp
greeting__wave.webp
laugh__dead.webp
congrats__party.webp
love__heart.webp
thanks__bow.webp
sorry__oops.webp
wow__shocked.webp
yes__thumbs.webp
no__nope.webp
party__confetti.webp
condolence__hug.webp
```

The part before `__` is the tag. Files without a recognised prefix still work —
they go into the `any` pool and are picked at random.

Supported tags: `amen`, `pray`, `greeting`, `laugh`, `love`, `congrats`,
`thanks`, `sorry`, `wow`, `yes`, `no`, `party`, `oops`, `condolence`.

## Rules

- **`.webp` only.** WhatsApp rejects anything else as a sticker.
- **512×512** is the canonical sticker size. Larger images still send, but they
  look wrong in the chat.
- Keep it **wholesome**. These go to real people and real groups.

## Where they come from

Any sticker you have already saved in WhatsApp can be exported from
`WhatsApp Business/Media/WhatsApp Stickers/` on the phone, or converted from a
`.webp` you already own. Copy them into this folder — nothing is uploaded
anywhere.

## Rate

How often a sticker follows a text reply is learned from the trained profile
(`src/data/style_profile.json` → the share of messages that were stickers). With
no training data the default is 6% of replies — roughly one in sixteen, which is
noticeable without being a gimmick.

Set `STICKER_DIR` in the environment to point somewhere else (for example a
mounted volume on Render).
