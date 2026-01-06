/**
 * Helper function to send error logs to the log_error API
 */
export const sendErrorLog = async (
  page: string,
  error: string | Error
) => {
  try {
    let user = "Unknown";
    const userData = localStorage.getItem("userData");
    if (userData) {
      const parsedData = JSON.parse(userData);
      user = parsedData.username || `${parsedData.firstname} ${parsedData.lastname}` || "Unknown";
    }

    const errorMessage = error instanceof Error 
      ? `${error.name}: ${error.message}\nStack: ${error.stack || 'N/A'}` 
      : String(error);

    const body = {
      sheet: "log_error",
      page: page,
      user: user,
      error: errorMessage
    };

    await fetch("/api/log_error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (logError) {
    // Silent fail for logging - don't disrupt user experience
    console.error("Failed to send error log:", logError);
  }
};
