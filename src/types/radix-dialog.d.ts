declare module "@radix-ui/react-dialog" {
  import { ReactNode } from "react";
  export const Root: React.ComponentType<{
    children?: ReactNode;
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
  }>;
  export const Trigger: React.ComponentType<
    { asChild?: boolean } & Record<string, unknown>
  >;
  export const Content: React.ComponentType<
    { asChild?: boolean } & Record<string, unknown>
  >;
  export const Portal: React.ComponentType<{ children?: ReactNode }>;
  export const Overlay: React.ComponentType<
    { asChild?: boolean } & Record<string, unknown>
  >;
  export const Title: React.ComponentType<
    { className?: string } & Record<string, unknown>
  >;
  export const Description: React.ComponentType<
    { className?: string } & Record<string, unknown>
  >;
}
