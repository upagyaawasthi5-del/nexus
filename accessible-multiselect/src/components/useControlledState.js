import { useState } from 'react';

export const useControlledState = (value, defaultValue, onChange) => {
  const [internalState, setInternalState] = useState(defaultValue || []);
  const isControlled = value !== undefined;
  const state = isControlled ? value : internalState;
  
  const updateState = (newValue) => {
    if (!isControlled) {
      setInternalState(newValue);
    }
    if (onChange) {
      onChange(newValue);
    }
  };

  return [state, updateState];
};