import React from 'react';
import PropTypes from 'prop-types';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...', fullScreen = false }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const spinnerClass = `animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`;

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          <div className={`${spinnerClass} mx-auto mb-4`}></div>
          <p className="text-gray-600">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="text-center">
        <div className={`${spinnerClass} mx-auto mb-2`}></div>
        <p className="text-gray-600 text-sm">{text}</p>
      </div>
    </div>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge']),
  text: PropTypes.string,
  fullScreen: PropTypes.bool,
};

export default LoadingSpinner;