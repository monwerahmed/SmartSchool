import app from "./app.js";
import { pinoLogger } from "./app/utils/pinno.logger.js";

const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
  pinoLogger.info(`🚀 Server is running on port ${PORT}`);
  pinoLogger.info(`📊 Health check: http://localhost:${PORT}/health`);
});
