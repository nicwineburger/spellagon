import "./styles/fonts.css";
import "./styles/tokens.css";
import "./styles/base.css";
import { mount } from "svelte";
import App from "./App.svelte";

const target = document.querySelector<HTMLElement>("#app");
if (target) mount(App, { target });
