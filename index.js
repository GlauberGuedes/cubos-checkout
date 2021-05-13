const express = require("express");
const swaggerUi = require("swagger-ui-express");
const roteador = require("./roteadores");

const app = express();
app.use(express.json());

app.use(roteador);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(require("./swagger.json")));

app.listen(8000);
