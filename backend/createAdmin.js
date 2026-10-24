require("dotenv").config();

const bcrypt =
  require("bcryptjs");

const pool =
  require("./config/db");


const createAdmin =
  async () => {

    try {

      const email =
        process.env.ADMIN_EMAIL
          .toLowerCase();

      const password =
        process.env.ADMIN_PASSWORD;


      const hashedPassword =
        await bcrypt.hash(
          password,
          12
        );


      const [existing] =
        await pool.execute(
          `
          SELECT id
          FROM users
          WHERE email = ?
          `,
          [email]
        );


      if (existing.length > 0) {

        await pool.execute(
          `
          UPDATE users

          SET
            name = ?,
            password = ?,
            role = 'admin'

          WHERE email = ?
          `,

          [
            "Administrator",
            hashedPassword,
            email,
          ]
        );

        console.log(
          "Admin updated successfully"
        );

      } else {

        await pool.execute(
          `
          INSERT INTO users
          (
            name,
            email,
            phone,
            password,
            role
          )

          VALUES
          (?, ?, ?, ?, 'admin')
          `,

          [
            "Administrator",
            email,
            "",
            hashedPassword,
          ]
        );

        console.log(
          "Admin created successfully"
        );
      }


      process.exit(0);

    } catch (error) {

      console.error(
        error
      );

      process.exit(1);

    }
  };


createAdmin();