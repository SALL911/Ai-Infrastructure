import express from 'express';
import { json } from 'body-parser';
import routes from './api/routes';
import { config } from './config';

const app = express();
const PORT = config.port || 3000;

app.use(json());
app.use('/api', routes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
