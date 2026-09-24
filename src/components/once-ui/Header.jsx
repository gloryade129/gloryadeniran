'use client';

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Fade, Flex, Line, Row, ToggleButton } from "@once-ui-system/core";
import { routes, display, person, about, work, contact, experience } from "@/resources";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./Header.module.scss";

const TimeDisplay = ({ timeZone, locale = "en-GB" }) => {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      try {
        const timeString = new Intl.DateTimeFormat(locale, options).format(now);
        setCurrentTime(timeString);
      } catch (e) {
        setCurrentTime(now.toLocaleTimeString());
      }
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, [timeZone, locale]);

  return <span>{currentTime}</span>;
};

export const Header = () => {
  const pathname = usePathname() ?? "";

  return (
    <>
      <Fade s={{ hide: true }} fillWidth position="fixed" height="80" zIndex={9} />
      <Fade
        hide
        s={{ hide: false }}
        fillWidth
        position="fixed"
        bottom="0"
        to="top"
        height="80"
        zIndex={9}
      />
      <Row
        fitHeight
        className={styles.position}
        position="sticky"
        as="header"
        zIndex={9}
        fillWidth
        padding="8"
        horizontal="center"
        data-border="rounded"
        s={{
          position: "fixed",
        }}
      >
        <Row paddingLeft="12" fillWidth vertical="center" textVariant="body-default-s">
          {display.location && (
            <Row s={{ hide: true }} gap="8" vertical="center" onBackground="neutral-weak">
              <span>Nigeria</span>
              <Line background="neutral-alpha-weak" vert height="12" />
              <TimeDisplay timeZone={person.location || "Africa/Lagos"} />
            </Row>
          )}
        </Row>
        <Row fillWidth horizontal="center">
          <Row
            background="page"
            border="neutral-alpha-weak"
            radius="m-4"
            shadow="l"
            padding="4"
            horizontal="center"
            zIndex={1}
            className="once-glass"
          >
            <Row gap="4" vertical="center" textVariant="body-default-s" suppressHydrationWarning>
              {routes["/"] && (
                <ToggleButton prefixIcon="home" href="/" selected={pathname === "/"} label="Home" />
              )}
              <Line background="neutral-alpha-medium" vert maxHeight="24" />
              {routes["/work"] && (
                <ToggleButton
                  prefixIcon="grid"
                  href="/work"
                  label={work.label}
                  selected={pathname.startsWith("/work")}
                />
              )}
              {routes["/about"] && (
                <ToggleButton
                  prefixIcon="person"
                  href="/about"
                  label={about.label}
                  selected={pathname === "/about"}
                />
              )}
              {routes["/experience"] && (
                <ToggleButton
                  prefixIcon="briefcase"
                  href="/experience"
                  label="Experience"
                  selected={pathname === "/experience"}
                />
              )}
              {routes["/contact"] && (
                <ToggleButton
                  prefixIcon="contact"
                  href="/contact"
                  label="Contact"
                  selected={pathname === "/contact"}
                />
              )}
            </Row>
          </Row>
        </Row>
        <Row paddingRight="12" fillWidth vertical="center" horizontal="end">
          {display.themeSwitcher && <ThemeToggle />}
        </Row>
      </Row>
    </>
  );
};

export default Header;
