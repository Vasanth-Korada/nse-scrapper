"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerDocOptions = void 0;
/* eslint-disable max-len */
var port = process.env.PORT || 3000;
var hostUrl = process.env.HOST_URL || "http://localhost:" + port;
exports.swaggerDocOptions = {
    definition: {
        "openapi": "3.0.0",
        "info": {
            "version": "1.1.0",
            "title": "National Stock Exchange - India (Unofficial)",
            "description": "This package will help us to get equity details and historical data from National Stock Exchange of India.",
            "contact": {
                "email": "asraf.cse@gmail.com"
            },
            "license": {
                "name": "MIT",
                "url": "https://github.com/hi-imcodeman/stock-nse-india/blob/master/LICENSE"
            }
        },
        "servers": [
            {
                "url": hostUrl
            }
        ],
        "tags": [
            {
                "name": "Base",
                "description": "Base API of NSE India"
            },
            {
                "name": "Common",
                "description": "Contains all common APIs of NSE India"
            },
            {
                "name": "Equity",
                "description": "Contains all equity related APIs of NSE India"
            },
            {
                "name": "Index",
                "description": "Contains all index related APIs of NSE India"
            },
            {
                "name": "Helpers",
                "description": "Contains all helper APIs of NSE India"
            },
        ]
    },
    apis: ['./build/server.js']
};
//# sourceMappingURL=swaggerDocOptions.js.map