import React, { useState } from 'react';
import { ENV_OPTIONS_ORDERED } from '../../environments/environments';

export function EnvironmentSelector({ onEnvironmentChange }) {
  const [currentEnvironment, setCurrentEnvironment] = useState('proc_hazard_hospital');

  const handleChange = (environment) => {
    setCurrentEnvironment(environment);
    onEnvironmentChange(environment);
  };

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 100,
      background: 'rgba(0,0,0,0.8)',
      padding: '10px',
      borderRadius: '5px',
      color: 'white',
      fontSize: '12px',
      maxWidth: '200px'
    }}>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ marginRight: '10px', display: 'block', marginBottom: '5px' }}>Environment:</label>
        <select
          value={currentEnvironment}
          onChange={(e) => handleChange(e.target.value)}
          style={{
            background: '#333',
            color: 'white',
            border: '1px solid #555',
            padding: '2px',
            width: '100%',
            fontSize: '11px'
          }}
        >
          {ENV_OPTIONS_ORDERED.map((env) => (
            <option key={env.id} value={env.id}>
              {env.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}