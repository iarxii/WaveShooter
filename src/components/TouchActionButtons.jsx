import React from 'react';
import { inputActions } from '../utils/inputActions';

const TouchActionButtons = ({ controlScheme }) => {
  if (controlScheme !== 'touch') return null;

  const isPortrait = window.innerHeight > window.innerWidth;
  const buttonSize = isPortrait ? 50 : 60;
  const fontSize = isPortrait ? 10 : 12;

  const containerStyle = {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: isPortrait ? 'column' : 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    zIndex: 1000,
    maxWidth: '90vw',
    maxHeight: '90vh',
  };

  const buttonStyle = {
    width: `${buttonSize}px`,
    height: `${buttonSize}px`,
    borderRadius: '6px',
    background: 'linear-gradient(180deg, #16a34a, #22c55e)',
    color: 'white',
    border: '1px solid #22c55e',
    fontSize: `${fontSize}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 0 rgba(0,0,0,0.18), 0 10px 22px rgba(16,185,129,0.06)',
    transition: 'transform 140ms ease, box-shadow 140ms ease, filter 140ms ease',
    textShadow: '0 1px 0 rgba(0,0,0,0.35)',
    fontWeight: 600,
    outline: 'none',
  };

  const buttonHoverStyle = {
    ...buttonStyle,
    transform: 'translateY(-2px)',
    filter: 'brightness(1.06)',
    boxShadow: '0 12px 28px rgba(16,185,129,0.14), 0 2px 0 rgba(0,0,0,0.12) inset',
  };

  return (
    <div style={containerStyle}>
      <button
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.filter = 'brightness(1.06)';
          e.target.style.boxShadow = '0 12px 28px rgba(16,185,129,0.14), 0 2px 0 rgba(0,0,0,0.12) inset';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = '';
          e.target.style.filter = '';
          e.target.style.boxShadow = '0 6px 0 rgba(0,0,0,0.18), 0 10px 22px rgba(16,185,129,0.06)';
          e.target.style.outline = 'none';
        }}
        onFocus={(e) => e.target.style.outline = '2px solid yellow'}
        onBlur={(e) => e.target.style.outline = 'none'}
        onClick={() => inputActions.jump()}
        aria-label="Jump Action (X/A button)"
        role="button"
        tabIndex={0}
      >
        Jump<br/>(X/A)
      </button>
      <button
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.filter = 'brightness(1.06)';
          e.target.style.boxShadow = '0 12px 28px rgba(16,185,129,0.14), 0 2px 0 rgba(0,0,0,0.12) inset';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = '';
          e.target.style.filter = '';
          e.target.style.boxShadow = '0 6px 0 rgba(0,0,0,0.18), 0 10px 22px rgba(16,185,129,0.06)';
          e.target.style.outline = 'none';
        }}
        onFocus={(e) => e.target.style.outline = '2px solid yellow'}
        onBlur={(e) => e.target.style.outline = 'none'}
        onClick={() => inputActions.dash()}
        aria-label="Dash Action (O/B button)"
        role="button"
        tabIndex={0}
      >
        Dash<br/>(O/B)
      </button>
      <button
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.filter = 'brightness(1.06)';
          e.target.style.boxShadow = '0 12px 28px rgba(16,185,129,0.14), 0 2px 0 rgba(0,0,0,0.12) inset';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = '';
          e.target.style.filter = '';
          e.target.style.boxShadow = '0 6px 0 rgba(0,0,0,0.18), 0 10px 22px rgba(16,185,129,0.06)';
          e.target.style.outline = 'none';
        }}
        onFocus={(e) => e.target.style.outline = '2px solid yellow'}
        onBlur={(e) => e.target.style.outline = 'none'}
        onClick={() => inputActions.heavyAttack()}
        aria-label="Heavy Attack"
        role="button"
        tabIndex={0}
      >
        Heavy
      </button>
      <button
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.filter = 'brightness(1.06)';
          e.target.style.boxShadow = '0 12px 28px rgba(16,185,129,0.14), 0 2px 0 rgba(0,0,0,0.12) inset';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = '';
          e.target.style.filter = '';
          e.target.style.boxShadow = '0 6px 0 rgba(0,0,0,0.18), 0 10px 22px rgba(16,185,129,0.06)';
          e.target.style.outline = 'none';
        }}
        onFocus={(e) => e.target.style.outline = '2px solid yellow'}
        onBlur={(e) => e.target.style.outline = 'none'}
        onClick={() => inputActions.specialAttack()}
        aria-label="Special Attack"
        role="button"
        tabIndex={0}
      >
        Special
      </button>
      <button
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.filter = 'brightness(1.06)';
          e.target.style.boxShadow = '0 12px 28px rgba(16,185,129,0.14), 0 2px 0 rgba(0,0,0,0.12) inset';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = '';
          e.target.style.filter = '';
          e.target.style.boxShadow = '0 6px 0 rgba(0,0,0,0.18), 0 10px 22px rgba(16,185,129,0.06)';
          e.target.style.outline = 'none';
        }}
        onFocus={(e) => e.target.style.outline = '2px solid yellow'}
        onBlur={(e) => e.target.style.outline = 'none'}
        onClick={() => inputActions.shapeRunCW()}
        aria-label="Shape Run Clockwise"
        role="button"
        tabIndex={0}
      >
        CW
      </button>
      <button
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.filter = 'brightness(1.06)';
          e.target.style.boxShadow = '0 12px 28px rgba(16,185,129,0.14), 0 2px 0 rgba(0,0,0,0.12) inset';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = '';
          e.target.style.filter = '';
          e.target.style.boxShadow = '0 6px 0 rgba(0,0,0,0.18), 0 10px 22px rgba(16,185,129,0.06)';
          e.target.style.outline = 'none';
        }}
        onFocus={(e) => e.target.style.outline = '2px solid yellow'}
        onBlur={(e) => e.target.style.outline = 'none'}
        onClick={() => inputActions.shapeRunCCW()}
        aria-label="Shape Run Counter Clockwise"
        role="button"
        tabIndex={0}
      >
        CCW
      </button>
    </div>
  );
};

export default TouchActionButtons;