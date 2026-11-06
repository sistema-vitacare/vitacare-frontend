import { Container, Typography } from '@mui/material';
import { appInfo } from './data/app.js';

export default function App() {
  return (
    <Container component="main" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {appInfo.name}
      </Typography>
      <Typography color="text.secondary">{appInfo.description}</Typography>
    </Container>
  );
}
