class ApiError extends Error {
  /**
   *
   * @param {number} statusCode
   * @param {string} message
   * @param {any[]} errors
   * @param {string} stack
   */
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor); // Error.captureStackTrace(this, this.constructor) is called to generate a stack trace automatically.
    }
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      success: this.success,
      data: this.data,
      message: this.message,
      errors: this.errors,
      stack: process.env.NODE_ENV === "development" ? this.stack : undefined
    };
    
  }

}


export default ApiError