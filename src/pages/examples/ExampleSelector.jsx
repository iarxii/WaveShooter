import React, { useState } from 'react';

const EXAMPLES = {
  instancing: {
    name: 'Instancing Dynamic',
    description: 'Dynamic instanced meshes with color transitions'
  },
  marchingcubes: {
    name: 'Marching Cubes',
    description: 'Metaball marching cubes algorithm'
  },
  spotlight: {
    name: 'Spotlight',
    description: 'Dynamic spotlight with shadows'
  },
  particles: {
    name: 'Particles',
    description: 'Animated particle system'
  },
  geometry: {
    name: 'Geometry',
    description: 'Various 3D geometric shapes'
  },
  morphsphere: {
    name: 'Morph Sphere',
    description: 'Morphing sphere with shape transitions'
  },
  instancingscatter: {
    name: 'Instancing Scatter',
    description: 'Scattered instanced objects in 3D space'
  },
  lod: {
    name: 'Level of Detail',
    description: 'LOD system with distance-based detail'
  },
  flocking: {
    name: 'Flocking',
    description: 'Simple flocking behavior simulation'
  },
  portal: {
    name: 'Portal',
    description: 'Portal effect with objects visible through surface'
  }
};

export function ExampleSelector({ onExampleChange }) {
  const [currentExample, setCurrentExample] = useState('instancing');

  const handleChange = (example) => {
    setCurrentExample(example);
    onExampleChange(example);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      zIndex: 100,
      background: 'rgba(0,0,0,0.8)',
      padding: '10px',
      borderRadius: '5px',
      color: 'white',
      fontSize: '12px'
    }}>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ marginRight: '10px' }}>Example:</label>
        <select
          value={currentExample}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            background: '#333',
            color: 'white',
            border: '1px solid #555',
            padding: '2px'
          }}
        >
          {Object.entries(EXAMPLES).map(([key, example]) => (
            <option key={key} value={key}>
              {example.name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ fontSize: '11px', color: '#ccc' }}>
        {EXAMPLES[currentExample].description}
      </div>
    </div>
  );
}