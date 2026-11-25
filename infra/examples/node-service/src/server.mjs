import { createApp } from './app.mjs';

const port = Number(process.env.PORT || 3000);
const server = createApp().listen(port, '0.0.0.0');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
