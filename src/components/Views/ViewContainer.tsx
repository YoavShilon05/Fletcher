import {ReactNode} from "react";

interface ViewContainerProps {
  children: ReactNode
}

export const ViewContainer = ({children}: ViewContainerProps) => {

  return (
    <div className="flex flex-col items-center justify-center w-full h-full text-center">
      {children}
    </div>
  );
};