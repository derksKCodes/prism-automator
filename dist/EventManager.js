const bundleToInject = () => {
    window.addEventListener("blur", (e) => e.stopImmediatePropagation(), true);
    window.addEventListener("focusout", (e) => e.stopImmediatePropagation(), true);
    Object.defineProperty(document, "visibilityState", { get: () => "visible", configurable: true });
    Object.defineProperty(document, "hidden", { get: () => false, configurable: true });
};
const funcAsStr = `(${bundleToInject.toString()})()`;
export default funcAsStr;
