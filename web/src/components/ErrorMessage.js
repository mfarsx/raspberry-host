import React from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ErrorMessage = ({ 
  error, 
  onRetry, 
  title = 'Something went wrong',
  showRetry = true,
  className = ''
}) => {
  const getErrorMessage = () => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.response?.data?.error) return error.response.data.error;
    return 'An unexpected error occurred';
  };

  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-center text-center p-6">
        <div>
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">{getErrorMessage()}</p>
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="btn btn-primary flex items-center mx-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

ErrorMessage.propTypes = {
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.instanceOf(Error)
  ]),
  onRetry: PropTypes.func,
  title: PropTypes.string,
  showRetry: PropTypes.bool,
  className: PropTypes.string,
};

export default ErrorMessage;