import ReactDOM from "react-dom/client";
import App from "./app";
import "./style.css";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "webagent-sidebar",
      position: "overlay",
      anchor: "body",
      append: "last",
      onMount(container) {
        const wrapper = document.createElement("div");
        wrapper.id = "webagent-root";
        container.append(wrapper);

        const root = ReactDOM.createRoot(wrapper);
        root.render(<App />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });

    ui.mount();
  },
});
