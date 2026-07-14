import app from "./src/app.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor encendido en el puerto ${PORT}`);
});