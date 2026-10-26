import { useEffect, useRef, type TextareaHTMLAttributes } from "react";
export function AutoTextarea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = () => {
    const element = ref.current;
    if (element) {
      element.style.height = "auto";
      element.style.height = `${element.scrollHeight + 2}px`;
    }
  };
  useEffect(resize, [props.value]);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    let width = element.clientWidth;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth !== width) {
        width = element.clientWidth;
        resize();
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <textarea
      {...props}
      ref={ref}
      onInput={(event) => {
        resize();
        props.onInput?.(event);
      }}
    />
  );
}
