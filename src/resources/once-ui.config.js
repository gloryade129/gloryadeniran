import { home, person, social } from "./content";

export const baseURL = "https://gloryadeniran.cv";

export const routes = {
  "/": true,
  "/work": true,
  "/about": true,
  "/experience": true,
  "/contact": true,
};

export const display = {
  location: true,
  time: true,
  themeSwitcher: true,
};

export const protectedRoutes = {};

export const style = {
  theme: "dark",
  neutral: "slate",
  brand: "blue",
  accent: "cyan",
  solid: "contrast",
  solidStyle: "flat",
  border: "rounded",
  surface: "translucent",
  transition: "all",
  scaling: "100",
};

export const dataStyle = {
  variant: "gradient",
  mode: "categorical",
  height: 24,
  axis: {
    stroke: "var(--neutral-alpha-weak)",
  },
  tick: {
    fill: "var(--neutral-on-background-weak)",
    fontSize: 11,
    line: false,
  },
};

export const effects = {
  mask: {
    cursor: false,
    x: 50,
    y: 0,
    radius: 100,
  },
  gradient: {
    display: true,
    opacity: 50,
    x: 50,
    y: 60,
    width: 100,
    height: 50,
    tilt: 0,
    colorStart: "brand-background-strong",
    colorEnd: "page-background",
  },
  dots: {
    display: true,
    opacity: 30,
    size: "2",
    color: "brand-background-strong",
  },
  grid: {
    display: false,
    opacity: 100,
    color: "neutral-alpha-medium",
    width: "0.25rem",
    height: "0.25rem",
  },
  lines: {
    display: false,
    opacity: 100,
    color: "neutral-alpha-weak",
    size: "16",
    thickness: 1,
    angle: 45,
  },
};

export const schema = {
  logo: "/itsa-logo.png",
  type: "Person",
  name: person.name,
  description: home.description,
  email: person.email,
};

export const sameAs = {
  instagram: social.find((s) => s.name === "Instagram")?.link ?? "",
  github: social.find((s) => s.name === "GitHub")?.link ?? "",
  linkedin: social.find((s) => s.name === "LinkedIn")?.link ?? "",
};
