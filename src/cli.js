"use strict";
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
require("dotenv/config");
var readline = require("node:readline");
var willys_api_js_1 = require("./willys-api.js");
var api = new willys_api_js_1.WillysApi();
var loggedIn = false;
function formatProduct(p, index) {
    var prefix = index != null ? "".concat(index + 1, ".") : "-";
    var stock = p.outOfStock ? " [OUT OF STOCK]" : "";
    return "".concat(prefix, " ").concat(p.name, " \u2014 ").concat(p.price).concat(stock, "\n   ").concat(p.productLine2 || "", " | Code: ").concat(p.code);
}
function printCategories(cat, indent) {
    if (indent === void 0) { indent = 0; }
    var pad = "  ".repeat(indent);
    console.log("".concat(pad, "- ").concat(cat.title, " (").concat(cat.url, ")"));
    for (var _i = 0, _a = cat.children; _i < _a.length; _i++) {
        var child = _a[_i];
        printCategories(child, indent + 1);
    }
}
var commands = {
    login: { usage: "login", desc: "Log in using credentials from .env" },
    logout: { usage: "logout", desc: "Log out" },
    whoami: { usage: "whoami", desc: "Show current user" },
    search: { usage: "search <query> [page]", desc: "Search for products" },
    categories: { usage: "categories [depth]", desc: "List categories" },
    browse: { usage: "browse <category-path> [page]", desc: "Browse a category" },
    cart: { usage: "cart", desc: "Show cart contents" },
    add: { usage: "add <product-code> [qty]", desc: "Add product to cart" },
    remove: { usage: "remove <product-code>", desc: "Remove product from cart" },
    clear: { usage: "clear", desc: "Clear the cart" },
    help: { usage: "help", desc: "Show this help" },
    quit: { usage: "quit", desc: "Exit" },
};
function handleCommand(line) {
    return __awaiter(this, void 0, void 0, function () {
        function printLimited(cat, depth) {
            if (depth > maxDepth_1)
                return;
            var pad = "  ".repeat(depth);
            console.log("".concat(pad, "- ").concat(cat.title, " (").concat(cat.url, ")"));
            for (var _i = 0, _a = cat.children; _i < _a.length; _i++) {
                var child = _a[_i];
                printLimited(child, depth + 1);
            }
        }
        var parts, cmd, args, _a, username, password, customer, customer, query, lastArg, page, searchQuery, results, i, maxDepth_1, tree, catPath, page, results, i, cart, _i, _b, p, code, qty, cart, cart, _c, _d, _e, info;
        var _f, _g, _h, _j, _k, _l, _m;
        return __generator(this, function (_o) {
            switch (_o.label) {
                case 0:
                    parts = line.split(/\s+/);
                    cmd = parts[0].toLowerCase();
                    args = parts.slice(1);
                    _a = cmd;
                    switch (_a) {
                        case "login": return [3 /*break*/, 1];
                        case "logout": return [3 /*break*/, 3];
                        case "whoami": return [3 /*break*/, 5];
                        case "search": return [3 /*break*/, 7];
                        case "s": return [3 /*break*/, 7];
                        case "categories": return [3 /*break*/, 9];
                        case "cats": return [3 /*break*/, 9];
                        case "browse": return [3 /*break*/, 11];
                        case "b": return [3 /*break*/, 11];
                        case "cart": return [3 /*break*/, 13];
                        case "add": return [3 /*break*/, 15];
                        case "remove": return [3 /*break*/, 17];
                        case "rm": return [3 /*break*/, 17];
                        case "clear": return [3 /*break*/, 19];
                        case "help": return [3 /*break*/, 21];
                        case "h": return [3 /*break*/, 21];
                        case "?": return [3 /*break*/, 21];
                        case "quit": return [3 /*break*/, 22];
                        case "exit": return [3 /*break*/, 22];
                        case "q": return [3 /*break*/, 22];
                    }
                    return [3 /*break*/, 25];
                case 1:
                    username = (_g = (_f = process.env.WILLYS_USERNAME) === null || _f === void 0 ? void 0 : _f.replace(/^"|"$/g, "")) !== null && _g !== void 0 ? _g : "";
                    password = (_j = (_h = process.env.WILLYS_PASSWORD) === null || _h === void 0 ? void 0 : _h.replace(/^"|"$/g, "")) !== null && _j !== void 0 ? _j : "";
                    if (!username || !password) {
                        console.log("Missing WILLYS_USERNAME or WILLYS_PASSWORD in .env");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, api.login(username, password)];
                case 2:
                    customer = _o.sent();
                    loggedIn = true;
                    console.log("Logged in as ".concat(customer.firstName, " ").concat(customer.lastName, " (").concat(customer.email, ")"));
                    return [3 /*break*/, 26];
                case 3: return [4 /*yield*/, api.logout()];
                case 4:
                    _o.sent();
                    loggedIn = false;
                    console.log("Logged out.");
                    return [3 /*break*/, 26];
                case 5: return [4 /*yield*/, api.getCustomer()];
                case 6:
                    customer = _o.sent();
                    if (customer.name === "anonymous") {
                        console.log("Not logged in.");
                    }
                    else {
                        console.log("".concat(customer.firstName, " ").concat(customer.lastName, " (").concat(customer.email, ")"));
                        console.log("Store: ".concat(customer.storeId));
                    }
                    return [3 /*break*/, 26];
                case 7:
                    query = args.slice(0, -1).join(" ") || args[0] || "";
                    lastArg = args[args.length - 1];
                    page = 0;
                    searchQuery = query;
                    if (args.length > 1 && /^\d+$/.test(lastArg)) {
                        page = parseInt(lastArg, 10);
                        searchQuery = args.slice(0, -1).join(" ");
                    }
                    else {
                        searchQuery = args.join(" ");
                    }
                    if (!searchQuery) {
                        console.log("Usage: search <query> [page]");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, api.search(searchQuery, page, 10)];
                case 8:
                    results = _o.sent();
                    console.log("Results ".concat(page * 10 + 1, "-").concat(Math.min((page + 1) * 10, results.pagination.totalNumberOfResults), " of ").concat(results.pagination.totalNumberOfResults, ":"));
                    for (i = 0; i < results.results.length; i++) {
                        console.log(formatProduct(results.results[i], page * 10 + i));
                    }
                    if (page + 1 < results.pagination.numberOfPages) {
                        console.log("\nPage ".concat(page + 1, "/").concat(results.pagination.numberOfPages, ". Use \"search ").concat(searchQuery, " ").concat(page + 1, "\" for next page."));
                    }
                    return [3 /*break*/, 26];
                case 9:
                    maxDepth_1 = parseInt((_k = args[0]) !== null && _k !== void 0 ? _k : "2", 10);
                    return [4 /*yield*/, api.getCategories()];
                case 10:
                    tree = _o.sent();
                    printLimited(tree, 0);
                    return [3 /*break*/, 26];
                case 11:
                    if (!args[0]) {
                        console.log("Usage: browse <category-path> [page]");
                        return [2 /*return*/];
                    }
                    catPath = args[0];
                    page = parseInt((_l = args[1]) !== null && _l !== void 0 ? _l : "0", 10);
                    return [4 /*yield*/, api.browseCategory(catPath, page, 10)];
                case 12:
                    results = _o.sent();
                    console.log("".concat(results.pagination.totalNumberOfResults, " products in category (page ").concat(page + 1, "/").concat(results.pagination.numberOfPages, "):"));
                    for (i = 0; i < results.results.length; i++) {
                        console.log(formatProduct(results.results[i], page * 10 + i));
                    }
                    return [3 /*break*/, 26];
                case 13: return [4 /*yield*/, api.getCart()];
                case 14:
                    cart = _o.sent();
                    if (cart.totalUnitCount === 0) {
                        console.log("Cart is empty.");
                        return [2 /*return*/];
                    }
                    console.log("Cart (".concat(cart.totalUnitCount, " items):"));
                    for (_i = 0, _b = cart.products; _i < _b.length; _i++) {
                        p = _b[_i];
                        console.log("  - ".concat(p.name, " x").concat(p.quantity, " \u2014 ").concat(p.totalPrice, " (").concat(p.code, ")"));
                    }
                    console.log("Total: ".concat(cart.totalPrice));
                    return [3 /*break*/, 26];
                case 15:
                    if (!args[0]) {
                        console.log("Usage: add <product-code> [qty]");
                        return [2 /*return*/];
                    }
                    code = args[0];
                    qty = parseInt((_m = args[1]) !== null && _m !== void 0 ? _m : "1", 10);
                    return [4 /*yield*/, api.addToCart([{ code: code, qty: qty }])];
                case 16:
                    cart = _o.sent();
                    console.log("Added. Cart now has ".concat(cart.totalUnitCount, " items, total: ").concat(cart.totalPrice));
                    return [3 /*break*/, 26];
                case 17:
                    if (!args[0]) {
                        console.log("Usage: remove <product-code>");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, api.removeFromCart(args[0])];
                case 18:
                    cart = _o.sent();
                    console.log("Removed. Cart now has ".concat(cart.totalUnitCount, " items."));
                    return [3 /*break*/, 26];
                case 19: return [4 /*yield*/, api.clearCart()];
                case 20:
                    _o.sent();
                    console.log("Cart cleared.");
                    return [3 /*break*/, 26];
                case 21:
                    {
                        console.log("Commands:");
                        for (_c = 0, _d = Object.entries(commands); _c < _d.length; _c++) {
                            _e = _d[_c], info = _e[1];
                            console.log("  ".concat(info.usage.padEnd(35), " ").concat(info.desc));
                        }
                        return [3 /*break*/, 26];
                    }
                    _o.label = 22;
                case 22:
                    if (!loggedIn) return [3 /*break*/, 24];
                    return [4 /*yield*/, api.logout()];
                case 23:
                    _o.sent();
                    _o.label = 24;
                case 24:
                    process.exit(0);
                    _o.label = 25;
                case 25:
                    console.log("Unknown command: ".concat(cmd, ". Type \"help\" for available commands."));
                    _o.label = 26;
                case 26: return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var username, password, customer, _a, lineQueue, lineResolve, rl, nextLine, line, trimmed, e_1, msg;
        var _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log("Willys CLI — type 'help' for commands, 'quit' to exit.");
                    username = (_c = (_b = process.env.WILLYS_USERNAME) === null || _b === void 0 ? void 0 : _b.replace(/^"|"$/g, "")) !== null && _c !== void 0 ? _c : "";
                    password = (_e = (_d = process.env.WILLYS_PASSWORD) === null || _d === void 0 ? void 0 : _d.replace(/^"|"$/g, "")) !== null && _e !== void 0 ? _e : "";
                    if (!(username && password)) return [3 /*break*/, 4];
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, api.login(username, password)];
                case 2:
                    customer = _f.sent();
                    loggedIn = true;
                    console.log("Auto-logged in as ".concat(customer.firstName, " ").concat(customer.lastName));
                    return [3 /*break*/, 4];
                case 3:
                    _a = _f.sent();
                    console.log("Auto-login failed. Use 'login' to try again.");
                    return [3 /*break*/, 4];
                case 4:
                    lineQueue = [];
                    lineResolve = null;
                    rl = readline.createInterface({ input: process.stdin });
                    rl.on("line", function (line) {
                        if (lineResolve) {
                            var resolve = lineResolve;
                            lineResolve = null;
                            resolve(line);
                        }
                        else {
                            lineQueue.push(line);
                        }
                    });
                    rl.on("close", function () {
                        if (lineResolve) {
                            var resolve = lineResolve;
                            lineResolve = null;
                            resolve(null);
                        }
                    });
                    nextLine = function () {
                        if (lineQueue.length > 0) {
                            return Promise.resolve(lineQueue.shift());
                        }
                        return new Promise(function (resolve) {
                            lineResolve = resolve;
                        });
                    };
                    _f.label = 5;
                case 5:
                    if (!true) return [3 /*break*/, 11];
                    if (process.stdin.isTTY)
                        process.stdout.write("willys> ");
                    return [4 /*yield*/, nextLine()];
                case 6:
                    line = _f.sent();
                    if (line === null)
                        return [3 /*break*/, 11];
                    trimmed = line.trim();
                    if (!trimmed)
                        return [3 /*break*/, 5];
                    _f.label = 7;
                case 7:
                    _f.trys.push([7, 9, , 10]);
                    return [4 /*yield*/, handleCommand(trimmed)];
                case 8:
                    _f.sent();
                    return [3 /*break*/, 10];
                case 9:
                    e_1 = _f.sent();
                    msg = e_1 instanceof Error ? e_1.message : String(e_1);
                    console.error("Error: ".concat(msg));
                    return [3 /*break*/, 10];
                case 10: return [3 /*break*/, 5];
                case 11: return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
