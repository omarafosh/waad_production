import { useEffect, useRef, MutableRefObject } from 'react';

// ==============================|| ELEMENT REFERENCE HOOKS ||============================== //

export default function useScriptRef(): MutableRefObject<boolean> {
  const scripted = useRef<boolean>(true);

  useEffect(() => {
    scripted.current = false;
  }, []);

  return scripted;
}
