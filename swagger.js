const swaggerAutogen = require("swagger-autogen");

swaggerAutogen()("./swagger.json", ["./roteadores.js"]);