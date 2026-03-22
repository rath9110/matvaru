"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WillysApi = void 0;
var crypto_js_1 = require("./crypto.js");
var BASE_URL = "https://www.willys.se";
var DEFAULT_STORE_ID = "2110";
var WillysApi = /** @class */ (function () {
    function WillysApi() {
        this.cookies = new Map();
        this.csrfToken = null;
    }
    /**
     * Make an HTTP request with cookie and CSRF token management.
     */
    WillysApi.prototype.request = function (path_1) {
        return __awaiter(this, arguments, void 0, function (path, options) {
            var url, headers, cookieStr, response;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        url = path.startsWith("http") ? path : "".concat(BASE_URL).concat(path);
                        headers = new Headers(options.headers);
                        headers.set("Accept", "application/json");
                        // Attach cookies
                        if (this.cookies.size > 0) {
                            cookieStr = Array.from(this.cookies.entries())
                                .map(function (_a) {
                                var k = _a[0], v = _a[1];
                                return "".concat(k, "=").concat(v);
                            })
                                .join("; ");
                            headers.set("Cookie", cookieStr);
                        }
                        // Attach CSRF token for mutating requests
                        if (options.method &&
                            options.method !== "GET" &&
                            this.csrfToken) {
                            headers.set("X-CSRF-TOKEN", this.csrfToken);
                        }
                        return [4 /*yield*/, fetch(url, __assign(__assign({}, options), { headers: headers, redirect: "manual" }))];
                    case 1:
                        response = _a.sent();
                        this.parseCookies(response);
                        return [2 /*return*/, response];
                }
            });
        });
    };
    /**
     * Parse Set-Cookie headers from a response and store them.
     */
    WillysApi.prototype.parseCookies = function (response) {
        var _a, _b, _c;
        var setCookieHeaders = (_c = (_b = (_a = response.headers).getSetCookie) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : [];
        for (var _i = 0, setCookieHeaders_1 = setCookieHeaders; _i < setCookieHeaders_1.length; _i++) {
            var header = setCookieHeaders_1[_i];
            var parts = header.split(";")[0];
            var eqIdx = parts.indexOf("=");
            if (eqIdx > 0) {
                var name_1 = parts.substring(0, eqIdx).trim();
                var value = parts.substring(eqIdx + 1).trim();
                this.cookies.set(name_1, value);
            }
        }
    };
    /**
     * Fetch a fresh CSRF token from the server.
     */
    WillysApi.prototype.getCsrfToken = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.cookies.has("JSESSIONID")) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.request("/api/config")];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.request("/axfood/rest/csrf-token")];
                    case 3:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Failed to get CSRF token: ".concat(response.status));
                        }
                        return [4 /*yield*/, response.json()];
                    case 4:
                        token = _a.sent();
                        this.csrfToken = token;
                        return [2 /*return*/, token];
                }
            });
        });
    };
    /**
     * Log in to Willys with username (personnummer) and password.
     * Credentials are encrypted client-side before sending.
     */
    WillysApi.prototype.login = function (username, password) {
        return __awaiter(this, void 0, void 0, function () {
            var encryptedUsername, encryptedPassword, body, response, text, location;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Ensure we have a CSRF token
                    return [4 /*yield*/, this.getCsrfToken()];
                    case 1:
                        // Ensure we have a CSRF token
                        _a.sent();
                        encryptedUsername = (0, crypto_js_1.encryptCredential)(username);
                        encryptedPassword = (0, crypto_js_1.encryptCredential)(password);
                        body = {
                            j_username: encryptedUsername.str,
                            j_username_key: encryptedUsername.key,
                            j_password: encryptedPassword.str,
                            j_password_key: encryptedPassword.key,
                            j_remember_me: true,
                        };
                        return [4 /*yield*/, this.request("/login", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(body),
                            })];
                    case 2:
                        response = _a.sent();
                        if (!(response.status >= 400)) return [3 /*break*/, 4];
                        return [4 /*yield*/, response.text()];
                    case 3:
                        text = _a.sent();
                        throw new Error("Login failed with status ".concat(response.status, ": ").concat(text.substring(0, 200)));
                    case 4:
                        location = response.headers.get("location");
                        if (!location) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.request(location)];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: 
                    // Refresh CSRF token after login
                    return [4 /*yield*/, this.getCsrfToken()];
                    case 7:
                        // Refresh CSRF token after login
                        _a.sent();
                        return [2 /*return*/, this.getCustomer()];
                }
            });
        });
    };
    /**
     * Log out from Willys.
     */
    WillysApi.prototype.logout = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.request("/logout")];
                    case 1:
                        _a.sent();
                        this.csrfToken = null;
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get the currently logged-in customer's profile.
     */
    WillysApi.prototype.getCustomer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.request("/axfood/rest/customer")];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Failed to get customer: ".concat(response.status));
                        }
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    /**
     * Search for products by text query.
     */
    WillysApi.prototype.search = function (query_1) {
        return __awaiter(this, arguments, void 0, function (query, page, size) {
            var params, response;
            if (page === void 0) { page = 0; }
            if (size === void 0) { size = 30; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = new URLSearchParams({
                            q: query,
                            size: size.toString(),
                            page: page.toString(),
                        });
                        return [4 /*yield*/, this.request("/search/clean?".concat(params))];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Search failed: ".concat(response.status));
                        }
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    /**
     * Get the full category tree.
     */
    WillysApi.prototype.getCategories = function () {
        return __awaiter(this, arguments, void 0, function (storeId) {
            var params, response;
            if (storeId === void 0) { storeId = DEFAULT_STORE_ID; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = new URLSearchParams({
                            storeId: storeId,
                            deviceType: "OTHER",
                        });
                        return [4 /*yield*/, this.request("/leftMenu/categorytree?".concat(params))];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Failed to get categories: ".concat(response.status));
                        }
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    /**
     * Browse products in a specific category.
     * @param categoryPath - URL path like "frukt-och-gront/frukt/citrusfrukt"
     */
    WillysApi.prototype.browseCategory = function (categoryPath_1) {
        return __awaiter(this, arguments, void 0, function (categoryPath, page, size, sort) {
            var params, response;
            if (page === void 0) { page = 0; }
            if (size === void 0) { size = 30; }
            if (sort === void 0) { sort = ""; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = new URLSearchParams({
                            page: page.toString(),
                            size: size.toString(),
                            sort: sort,
                        });
                        return [4 /*yield*/, this.request("/c/".concat(categoryPath, "?").concat(params))];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Browse category failed: ".concat(response.status));
                        }
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    /**
     * Get the current shopping cart.
     */
    WillysApi.prototype.getCart = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.request("/axfood/rest/cart")];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Failed to get cart: ".concat(response.status));
                        }
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    /**
     * Add one or more products to the cart.
     */
    WillysApi.prototype.addToCart = function (products) {
        return __awaiter(this, void 0, void 0, function () {
            var body, response, text;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.csrfToken) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getCsrfToken()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        body = {
                            products: products.map(function (p) { return ({
                                productCodePost: p.code,
                                qty: p.qty,
                                pickUnit: "pieces",
                                hideDiscountToolTip: false,
                                noReplacementFlag: false,
                            }); }),
                        };
                        return [4 /*yield*/, this.request("/axfood/rest/cart/addProducts", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(body),
                            })];
                    case 3:
                        response = _a.sent();
                        if (!!response.ok) return [3 /*break*/, 5];
                        return [4 /*yield*/, response.text()];
                    case 4:
                        text = _a.sent();
                        throw new Error("Add to cart failed: ".concat(response.status, " - ").concat(text.substring(0, 200)));
                    case 5: return [2 /*return*/, this.getCart()];
                }
            });
        });
    };
    /**
     * Remove a product from the cart (sets quantity to 0).
     */
    WillysApi.prototype.removeFromCart = function (productCode) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.addToCart([{ code: productCode, qty: 0 }])];
            });
        });
    };
    /**
     * Clear all products from the cart.
     */
    WillysApi.prototype.clearCart = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.csrfToken) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getCsrfToken()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.request("/axfood/rest/cart", {
                            method: "DELETE",
                        })];
                    case 3:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Clear cart failed: ".concat(response.status));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return WillysApi;
}());
exports.WillysApi = WillysApi;
