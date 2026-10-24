const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");


// =====================================================
// SIGNUP
// =====================================================

const signup = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
    } = req.body;


    // ---------------------------------------------
    // BASIC VALIDATION
    // ---------------------------------------------

    if (
      !name ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }


    const cleanName = name.trim();

    const cleanEmail = email
      .trim()
      .toLowerCase();

    const cleanPhone = phone.trim();


    // ---------------------------------------------
    // EMAIL VALIDATION
    // ---------------------------------------------

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }


    // ---------------------------------------------
    // PHONE VALIDATION
    // ---------------------------------------------

    const phoneRegex =
      /^[6-9]\d{9}$/;

    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid 10 digit Indian phone number.",
      });
    }


    // ---------------------------------------------
    // PASSWORD VALIDATION
    // ---------------------------------------------

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters.",
      });
    }


    // ---------------------------------------------
    // CHECK EXISTING EMAIL
    // ---------------------------------------------

    const [existingUsers] = await db.execute(
      `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [cleanEmail]
    );


    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This email is already registered!",
      });
    }


    // ---------------------------------------------
    // HASH PASSWORD
    // ---------------------------------------------

    const hashedPassword =
      await bcrypt.hash(password, 10);


    // ---------------------------------------------
    // INSERT USER
    // ---------------------------------------------

    const [result] = await db.execute(
      `
      INSERT INTO users
      (
        name,
        email,
        phone,
        password,
        address,
        photo,
        role
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        cleanName,
        cleanEmail,
        cleanPhone,
        hashedPassword,
        "",
        "",
        "user",
      ]
    );


    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully!",

      user: {
        id: result.insertId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        address: "",
        photo: "",
        role: "user",
      },
    });

  } catch (error) {

    console.error(
      "Signup Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while creating account.",
    });
  }
};



// =====================================================
// LOGIN
// =====================================================

const login = async (req, res) => {
  try {

    const {
      email,
      password,
    } = req.body;


    // ---------------------------------------------
    // VALIDATION
    // ---------------------------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }


    const cleanEmail = email
      .trim()
      .toLowerCase();


    // ---------------------------------------------
    // FIND USER
    // ---------------------------------------------

    const [users] = await db.execute(
      `
      SELECT
        id,
        name,
        email,
        phone,
        password,
        address,
        photo,
        role
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [cleanEmail]
    );


    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          "Account not found. Please create an account first.",
      });
    }


    const user = users[0];


    // ---------------------------------------------
    // CHECK PASSWORD
    // ---------------------------------------------

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );


    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password!",
      });
    }


    // ---------------------------------------------
    // CREATE JWT
    // ---------------------------------------------

    const token =
      jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },

        process.env.JWT_SECRET,

        {
          expiresIn: "7d",
        }
      );


    // ---------------------------------------------
    // USER DATA
    // ---------------------------------------------

    const loggedInUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
      photo: user.photo || "",
      role: user.role || "user",
    };


    // ---------------------------------------------
    // RESPONSE
    // ---------------------------------------------

    return res.status(200).json({
      success: true,

      message:
        `Welcome back, ${loggedInUser.name}!`,

      token,

      user: loggedInUser,
    });

  } catch (error) {

    console.error(
      "Login Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error while logging in.",
    });
  }
};



// =====================================================
// GET CURRENT USER
// =====================================================

const getMe = async (req, res) => {

  try {

    const [users] = await db.execute(
      `
      SELECT
        id,
        name,
        email,
        phone,
        address,
        photo,
        role
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [req.user.id]
    );


    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }


    return res.status(200).json({
      success: true,
      user: users[0],
    });

  } catch (error) {

    console.error(
      "Get Me Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};


module.exports = {
  signup,
  login,
  getMe,
};