const express = require("express");

const {
  signup,
  login,
  getMe,
} = require("../controllers/authController");

const authMiddleware =
  require("../middleware/authMiddleware");


const router =
  express.Router();


// =====================================================
// SIGNUP
// POST /api/auth/signup
// =====================================================

router.post(
  "/signup",
  signup
);


// =====================================================
// LOGIN
// POST /api/auth/login
// =====================================================

router.post(
  "/login",
  login
);


// =====================================================
// CURRENT USER
// GET /api/auth/me
// =====================================================

router.get(
  "/me",
  authMiddleware,
  getMe
);


module.exports =
  router;