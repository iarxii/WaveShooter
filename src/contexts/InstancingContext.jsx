import React, { createContext, useContext, useState } from 'react';

const InstancingContext = createContext();

export function InstancingProvider({ children }) {
  const [instancingColors, setInstancingColors] = useState([
    '#00ffff', '#ffff00', '#ff00ff'
  ]);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [animationType, setAnimationType] = useState('bounce');
  const [shape, setShape] = useState('box');
  const [gap, setGap] = useState(1);

  return (
    <InstancingContext.Provider value={{ instancingColors, setInstancingColors, animationSpeed, setAnimationSpeed, animationType, setAnimationType, shape, setShape, gap, setGap }}>
      {children}
    </InstancingContext.Provider>
  );
}

export function useInstancing() {
  return useContext(InstancingContext);
}