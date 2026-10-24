const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,

  ssl:
    process.env.DB_HOST &&
    !["localhost", "127.0.0.1"].includes(
      process.env.DB_HOST
    )
      ? { rejectUnauthorized: false }
      : undefined,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const testDatabaseConnection = async () => {
  try {
    const connection = await pool.getConnection();

    /* log which physical server is actually serving this
       connection — this machine has had TWO mysqld installs
       (XAMPP + standalone MariaDB) competing for :3306, and
       a silent switch once made data "disappear" */
    const [info] = await connection.query(
      "SELECT @@version AS v, @@datadir AS d, @@port AS p, CURRENT_USER() AS u"
    );
    const s = info[0];

    console.log("=================================");
    console.log("MySQL Database Connected");
    console.log("Database:", process.env.DB_NAME);
    console.log("Server:", s.v, "| port", s.p);
    console.log("Datadir:", s.d);
    console.log("DB user:", s.u);
    console.log("=================================");

    connection.release();
  } catch (error) {
    console.error("MySQL Connection Failed:");
    console.error(error.message);
  }
};

testDatabaseConnection();

module.exports = pool;