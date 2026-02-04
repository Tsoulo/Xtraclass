declare module 'react-katex' {
  import { ComponentType, ReactNode } from 'react';
  
  export interface KaTeXProps {
    math: string;
    block?: boolean;
    errorColor?: string;
    renderError?: (error: Error) => ReactNode;
    settings?: object;
    children?: ReactNode;
  }
  
  export const InlineMath: ComponentType<KaTeXProps>;
  export const BlockMath: ComponentType<KaTeXProps>;
}
