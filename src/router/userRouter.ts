import express from "express";
import { UserController } from "../userController/userController";
import { TokenService } from "../service/tokenservice";
import { RefreshTokenSchema } from "../database/refreshToken";
import { authMiddleware } from "../../midellware/authenticate";
import { verifyAccessToken } from "../../midellware/authenticate";
const refreshTokenRepository = RefreshTokenSchema;

const tokenService = new TokenService(refreshTokenRepository);

const userController = new UserController(tokenService);
const router = express.Router();

router.post("/createUser", (req, res) => userController.createUser(req, res));
router.post("/loginUser", (req, res) => userController.loginUser(req, res));
router.post("/refresh", (req, res) => userController.refreshToken(req, res));
router.get("/selfData", verifyAccessToken, (req, res) =>
  userController.selfData(req, res)
);

export default router;
