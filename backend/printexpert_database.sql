-- =====================================================================
-- PRINT EXPERT -- COMPLETE DATABASE (schema + starter data)
-- Printing Solutions, Perfect Results
--
-- Run once as a MySQL / MariaDB admin:
--     mysql -u root -p < printexpert_database.sql
-- Safe to re-run: tables use IF NOT EXISTS, seed rows use INSERT IGNORE.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `printexpert`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `printexpert`;

SET NAMES utf8mb4;

-- App login used by backend/.env  (change the password before production)
CREATE USER IF NOT EXISTS 'printexpert_app'@'localhost' IDENTIFIED BY '7dwu9evic3amlr48gqkb';
CREATE USER IF NOT EXISTS 'printexpert_app'@'127.0.0.1' IDENTIFIED BY '7dwu9evic3amlr48gqkb';
GRANT ALL PRIVILEGES ON `printexpert`.* TO 'printexpert_app'@'localhost';
GRANT ALL PRIVILEGES ON `printexpert`.* TO 'printexpert_app'@'127.0.0.1';
FLUSH PRIVILEGES;

-- ============================ TABLES ================================

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `password` VARCHAR(255) NOT NULL,
  `address` TEXT DEFAULT NULL,
  `photo` TEXT DEFAULT NULL,
  `role` VARCHAR(20) DEFAULT 'user',
  `status` VARCHAR(20) NOT NULL DEFAULT 'Active',
  `city` VARCHAR(100) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT NULL,
  `pincode` VARCHAR(10) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(190) NOT NULL,
  `otp` VARCHAR(6) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `used` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pr_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `items` TEXT DEFAULT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `slug` VARCHAR(190) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `category_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `subcategories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(190) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Active',
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sub_cat_name` (`category_id`,`name`),
  KEY `category_id` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) DEFAULT 'General',
  `subcategory` VARCHAR(100) DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `old_price` DECIMAL(10,2) DEFAULT NULL,
  `stock` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Active',
  `badge` VARCHAR(50) DEFAULT NULL,
  `rating` DECIMAL(2,1) DEFAULT 4.8,
  `reviews` INT DEFAULT 0,
  `discount` VARCHAR(20) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `images` LONGTEXT DEFAULT NULL,
  `paper_types` TEXT DEFAULT NULL,
  `sizes` TEXT DEFAULT NULL,
  `features` TEXT DEFAULT NULL,
  `quantity_step` INT NOT NULL DEFAULT 1,
  `customizable` TINYINT(1) NOT NULL DEFAULT 0,
  `customization_type` VARCHAR(50) DEFAULT NULL,
  `weight_grams` INT DEFAULT NULL,
  `category_id` INT DEFAULT NULL,
  `subcategory_id` INT DEFAULT NULL,
  `unit` VARCHAR(30) DEFAULT NULL,
  `max_qty` INT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `product_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `thumbnail` TEXT DEFAULT NULL,
  `design_data` LONGTEXT DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Active',
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pt_product` (`product_id`),
  CONSTRAINT `fk_pt_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `tags` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tag_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `product_tags` (
  `product_id` INT NOT NULL,
  `tag_id` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`,`tag_id`),
  KEY `tag_id` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `product_attributes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(140) DEFAULT NULL,
  `type` VARCHAR(20) NOT NULL DEFAULT 'select',
  `status` VARCHAR(20) NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attr_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `attribute_values` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `attribute_id` INT NOT NULL,
  `value` VARCHAR(150) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'Active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attr_value` (`attribute_id`,`value`),
  KEY `attribute_id` (`attribute_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `product_attribute_values` (
  `product_id` INT NOT NULL,
  `attribute_id` INT NOT NULL,
  `attribute_value_id` INT NOT NULL DEFAULT 0,
  `text_value` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`,`attribute_id`,`attribute_value_id`),
  KEY `attribute_id` (`attribute_id`),
  KEY `attribute_value_id` (`attribute_value_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `attribute_scopes` (
  `attribute_id` INT NOT NULL,
  `category_id` INT NOT NULL DEFAULT 0,
  `subcategory_id` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`attribute_id`,`category_id`,`subcategory_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` VARCHAR(60) DEFAULT NULL,
  `user_id` INT DEFAULT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'New',
  `customer_name` VARCHAR(150) DEFAULT NULL,
  `email` VARCHAR(190) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `total` DECIMAL(10,2) DEFAULT 0,
  `total_price` DECIMAL(10,2) DEFAULT 0,
  `payment_method` VARCHAR(50) DEFAULT NULL,
  `payment_status` VARCHAR(30) DEFAULT 'Pending',
  `items` LONGTEXT DEFAULT NULL,
  `payload` LONGTEXT DEFAULT NULL,
  `razorpay_order_id` VARCHAR(80) DEFAULT NULL,
  `razorpay_payment_id` VARCHAR(80) DEFAULT NULL,
  `razorpay_signature` VARCHAR(255) DEFAULT NULL,
  `payment_attempts` INT NOT NULL DEFAULT 0,
  `cancelled_at` TIMESTAMP NULL DEFAULT NULL,
  `cancelled_by` VARCHAR(50) DEFAULT NULL,
  `cancel_reason` VARCHAR(500) DEFAULT NULL,
  `refund_status` VARCHAR(30) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_id` (`order_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `paper_type` VARCHAR(50) DEFAULT NULL,
  `size` VARCHAR(50) DEFAULT NULL,
  `attributes` JSON DEFAULT NULL,
  `item_type` VARCHAR(20) NOT NULL DEFAULT 'standard',
  `customization` JSON DEFAULT NULL,
  `uploaded_designs` JSON DEFAULT NULL,
  `variant_hash` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ci_user` (`user_id`),
  KEY `idx_ci_product` (`product_id`),
  UNIQUE KEY `uq_ci_variant` (`user_id`,`variant_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `customization_drafts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `editor` VARCHAR(30) NOT NULL DEFAULT 'customizer',
  `product_id` VARCHAR(64) NOT NULL,
  `draft` LONGTEXT NOT NULL,
  `revision` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_draft_user` (`user_id`,`editor`,`product_id`),
  KEY `idx_draft_updated` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_favorites` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `product_id` VARCHAR(64) NOT NULL,
  `snapshot` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_fav_user` (`user_id`,`product_id`),
  KEY `idx_fav_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `uploaded_files` (
  `id` VARCHAR(64) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `mime` VARCHAR(100) NOT NULL,
  `size` INT NOT NULL,
  `data` LONGBLOB NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `feedback` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `subject` VARCHAR(255) DEFAULT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('contact','review','complaint') DEFAULT 'contact',
  `product_id` INT DEFAULT NULL,
  `rating` INT DEFAULT NULL,
  `status` ENUM('Pending','Reviewed','Resolved') DEFAULT 'Pending',
  `admin_reply` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `contact_inquiries` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `company_name` VARCHAR(200) DEFAULT NULL,
  `email` VARCHAR(200) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `product_id` VARCHAR(50) DEFAULT NULL,
  `product_name` VARCHAR(255) DEFAULT NULL,
  `product_options` VARCHAR(255) DEFAULT NULL,
  `quantity` INT DEFAULT NULL,
  `message` TEXT NOT NULL,
  `source` VARCHAR(50) DEFAULT 'website',
  `status` VARCHAR(20) NOT NULL DEFAULT 'new',
  `admin_notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `admin_notification_reads` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `admin_id` INT NOT NULL,
  `notif_key` VARCHAR(100) NOT NULL,
  `read_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `hidden` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_admin_notif` (`admin_id`,`notif_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `coupons` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `type` ENUM('percent','flat') NOT NULL DEFAULT 'percent',
  `value` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `min_order` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `valid_from` DATETIME NOT NULL,
  `valid_to` DATETIME NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `coupon_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `delivery_charges` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `pincode` CHAR(6) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `state` VARCHAR(100) NOT NULL,
  `charge` DECIMAL(10,2) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_delivery_pincode` (`pincode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================ STARTER DATA ===========================

-- Admin account. Sign in at /admin with ADMIN_EMAIL / ADMIN_PASSWORD from backend/.env
INSERT INTO users (name,email,phone,password,role,status) VALUES ('Administrator','admin@printexpert.com','','$2b$10$9HSzqftqFstHPvhu0rIkb.qQoCfXNrHK0Pr.oXG6EwsTHC2S3HXE.','admin','Active')
  ON DUPLICATE KEY UPDATE role='admin';

-- Categories (top navigation)
INSERT IGNORE INTO categories (name,items,sort_order,slug,status) VALUES ('Visiting Cards','["Premium Business Cards","Standard Cards","Matte Cards","Glossy Cards"]',0,'visiting-cards','Active');
INSERT IGNORE INTO categories (name,items,sort_order,slug,status) VALUES ('Stationery & Office','["Letterheads","Notebooks","Envelopes","Office Files","Stamps"]',1,'stationery-office','Active');
INSERT IGNORE INTO categories (name,items,sort_order,slug,status) VALUES ('Marketing Materials','["Flyers","Brochures","Posters","Leaflets","Calendars"]',2,'marketing-materials','Active');
INSERT IGNORE INTO categories (name,items,sort_order,slug,status) VALUES ('Stickers & Labels','["Product Labels","Vinyl Stickers","Round Stickers","Packaging Labels"]',3,'stickers-labels','Active');
INSERT IGNORE INTO categories (name,items,sort_order,slug,status) VALUES ('Packaging','["Paper Bags","Boxes","Food Packaging","Product Packaging"]',4,'packaging','Active');
INSERT IGNORE INTO categories (name,items,sort_order,slug,status) VALUES ('Clothing & Bags','["T-Shirts","Caps","Tote Bags","Corporate Bags"]',5,'clothing-bags','Active');
INSERT IGNORE INTO categories (name,items,sort_order,slug,status) VALUES ('Mugs & Gifts','["Coffee Mugs","Photo Mugs","Keychains","Corporate Gifts"]',6,'mugs-gifts','Active');
INSERT IGNORE INTO categories (name,items,sort_order,slug,status) VALUES ('Pens & Drinkware','["Ball Pens","Premium Pens","Water Bottles","Travel Mugs"]',7,'pens-drinkware','Active');
INSERT IGNORE INTO categories (name,items,sort_order,slug,status) VALUES ('Custom Polo T-Shirts','["Corporate Polo","Printed Polo","Custom T-Shirts"]',8,'custom-polo-t-shirts','Active');

-- Sub-categories (navigation drop-down items)
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Premium Business Cards','premium-business-cards',0,'Active' FROM categories WHERE name='Visiting Cards';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Standard Cards','standard-cards',1,'Active' FROM categories WHERE name='Visiting Cards';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Matte Cards','matte-cards',2,'Active' FROM categories WHERE name='Visiting Cards';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Glossy Cards','glossy-cards',3,'Active' FROM categories WHERE name='Visiting Cards';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Letterheads','letterheads',0,'Active' FROM categories WHERE name='Stationery & Office';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Notebooks','notebooks',1,'Active' FROM categories WHERE name='Stationery & Office';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Envelopes','envelopes',2,'Active' FROM categories WHERE name='Stationery & Office';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Office Files','office-files',3,'Active' FROM categories WHERE name='Stationery & Office';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Stamps','stamps',4,'Active' FROM categories WHERE name='Stationery & Office';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Flyers','flyers',0,'Active' FROM categories WHERE name='Marketing Materials';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Brochures','brochures',1,'Active' FROM categories WHERE name='Marketing Materials';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Posters','posters',2,'Active' FROM categories WHERE name='Marketing Materials';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Leaflets','leaflets',3,'Active' FROM categories WHERE name='Marketing Materials';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Calendars','calendars',4,'Active' FROM categories WHERE name='Marketing Materials';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Product Labels','product-labels',0,'Active' FROM categories WHERE name='Stickers & Labels';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Vinyl Stickers','vinyl-stickers',1,'Active' FROM categories WHERE name='Stickers & Labels';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Round Stickers','round-stickers',2,'Active' FROM categories WHERE name='Stickers & Labels';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Packaging Labels','packaging-labels',3,'Active' FROM categories WHERE name='Stickers & Labels';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Paper Bags','paper-bags',0,'Active' FROM categories WHERE name='Packaging';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Boxes','boxes',1,'Active' FROM categories WHERE name='Packaging';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Food Packaging','food-packaging',2,'Active' FROM categories WHERE name='Packaging';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Product Packaging','product-packaging',3,'Active' FROM categories WHERE name='Packaging';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'T-Shirts','t-shirts',0,'Active' FROM categories WHERE name='Clothing & Bags';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Caps','caps',1,'Active' FROM categories WHERE name='Clothing & Bags';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Tote Bags','tote-bags',2,'Active' FROM categories WHERE name='Clothing & Bags';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Corporate Bags','corporate-bags',3,'Active' FROM categories WHERE name='Clothing & Bags';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Coffee Mugs','coffee-mugs',0,'Active' FROM categories WHERE name='Mugs & Gifts';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Photo Mugs','photo-mugs',1,'Active' FROM categories WHERE name='Mugs & Gifts';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Keychains','keychains',2,'Active' FROM categories WHERE name='Mugs & Gifts';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Corporate Gifts','corporate-gifts',3,'Active' FROM categories WHERE name='Mugs & Gifts';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Ball Pens','ball-pens',0,'Active' FROM categories WHERE name='Pens & Drinkware';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Premium Pens','premium-pens',1,'Active' FROM categories WHERE name='Pens & Drinkware';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Water Bottles','water-bottles',2,'Active' FROM categories WHERE name='Pens & Drinkware';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Travel Mugs','travel-mugs',3,'Active' FROM categories WHERE name='Pens & Drinkware';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Corporate Polo','corporate-polo',0,'Active' FROM categories WHERE name='Custom Polo T-Shirts';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Printed Polo','printed-polo',1,'Active' FROM categories WHERE name='Custom Polo T-Shirts';
INSERT IGNORE INTO subcategories (category_id,name,slug,sort_order,status) SELECT id,'Custom T-Shirts','custom-t-shirts',2,'Active' FROM categories WHERE name='Custom Polo T-Shirts';

-- Products (ids 1-30 match /products/<id>-front.svg and -back.svg mock-ups)
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 1,'Premium Business Cards','Visiting Cards','Premium Business Cards',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Premium Business Cards'),299,499,100,'Active','PREMIUM',4.8,128,'40% OFF','Make a lasting impression with premium quality business cards printed on high-quality paper.','["/products/1-front.svg","/products/1-back.svg"]','["Matte","Glossy","Textured"]','["Standard (3.5 × 2)","Square (2.5 × 2.5)"]','["350 GSM Premium Paper","Matte Finish","Full Color Printing","Double Side Printing","High Resolution","Custom Design Support"]',1,'business-card',250
FROM categories c WHERE c.name='Visiting Cards';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 2,'Luxury Matte Cards','Visiting Cards','Matte Cards',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Matte Cards'),449,699,100,'Active','BEST SELLER',4.9,96,'36% OFF','Elegant luxury visiting cards designed for businesses that want a premium professional identity.','["/products/2-front.svg","/products/2-back.svg"]','["Matte","Luxury","Textured"]','["Standard","Square"]','["400 GSM Premium Paper","Luxury Matte Finish","Sharp Printing","Premium Color Quality","Double Side Printing","Professional Design Support"]',1,'business-card',280
FROM categories c WHERE c.name='Visiting Cards';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 3,'Elegant Black Business Cards','Visiting Cards','Premium Business Cards',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Premium Business Cards'),399,599,100,'Active','NEW',4.7,74,'33% OFF','Bold black business cards with a sophisticated finish for premium brands and professionals.','["/products/3-front.svg","/products/3-back.svg"]','["Matte","Glossy"]','["Standard","Rounded Corner"]','["Premium Black Paper","Luxury Finish","High Resolution Printing","Water Resistant","Double Side Printing","Custom Branding"]',1,'business-card',260
FROM categories c WHERE c.name='Visiting Cards';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 4,'Corporate Business Cards','Visiting Cards','Standard Cards',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Standard Cards'),249,399,100,'Active','POPULAR',4.6,52,'38% OFF','Clean and professional corporate visiting cards for offices, companies and startups.','["/products/4-front.svg","/products/4-back.svg"]','["Matte","Glossy"]','["Standard"]','["300 GSM Paper","Professional Finish","Full Color Printing","Fast Delivery","High Quality Print","Custom Design"]',1,'business-card',220
FROM categories c WHERE c.name='Visiting Cards';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 5,'Textured Finish Cards','Visiting Cards','Premium Business Cards',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Premium Business Cards'),499,799,100,'Active','PREMIUM',4.8,88,'37% OFF','Premium textured visiting cards with a unique tactile finish.','["/products/5-front.svg","/products/5-back.svg"]','["Textured","Matte"]','["Standard","Square"]','["350 GSM Textured Paper","Premium Feel","Sharp Print","Luxury Finish","Double Side Printing","Design Assistance"]',1,'business-card',290
FROM categories c WHERE c.name='Visiting Cards';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 6,'Rounded Corner Cards','Visiting Cards','Glossy Cards',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Glossy Cards'),349,549,100,'Active','NEW',4.7,69,'36% OFF','Modern rounded-corner business cards for a clean and contemporary brand identity.','["/products/6-front.svg","/products/6-back.svg"]','["Matte","Glossy"]','["Rounded Corner"]','["350 GSM Paper","Rounded Corners","Premium Printing","Smooth Finish","High Quality Colors","Custom Design"]',1,'business-card',240
FROM categories c WHERE c.name='Visiting Cards';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 7,'Ultra Premium Cards','Visiting Cards','Premium Business Cards',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Premium Business Cards'),599,999,100,'Active','BEST SELLER',4.9,112,'40% OFF','Our most premium business card collection designed for luxury brands.','["/products/7-front.svg","/products/7-back.svg"]','["Luxury","Textured","Matte"]','["Standard","Square"]','["450 GSM Luxury Paper","Premium Finish","Foil Printing","Embossed Options","Double Side Printing","Free Design Support"]',1,'business-card',320
FROM categories c WHERE c.name='Visiting Cards';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 8,'Minimal Design Cards','Visiting Cards','Standard Cards',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Standard Cards'),199,299,100,'Active','POPULAR',4.5,43,'33% OFF','Minimal and elegant business cards for modern professionals and startups.','["/products/8-front.svg","/products/8-back.svg"]','["Matte","Glossy"]','["Standard"]','["300 GSM Paper","Minimal Finish","Full Color Printing","Fast Production","Professional Quality","Easy Customization"]',1,'business-card',200
FROM categories c WHERE c.name='Visiting Cards';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 9,'Premium Letterheads','Stationery & Office','Letterheads',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Letterheads'),199,349,100,'Active','POPULAR',4.6,45,'43% OFF','Professional letterheads printed on premium paper for your business correspondence.','["/products/9-front.svg","/products/9-back.svg"]','["Bond Paper","Executive"]','["A4","Letter"]','["100 GSM Bond Paper","Full Color","Custom Header","Watermark Option"]',1,'letterhead',600
FROM categories c WHERE c.name='Stationery & Office';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 10,'Spiral Notebooks','Stationery & Office','Notebooks',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Notebooks'),149,249,100,'Active','NEW',4.5,32,'40% OFF','Custom branded spiral notebooks perfect for corporate gifting and office use.','["/products/10-front.svg","/products/10-back.svg"]','["Ruled","Plain","Grid"]','["A5","A4"]','["80 GSM Paper","120 Pages","Custom Cover","Spiral Binding"]',1,'spiral-notebook',400
FROM categories c WHERE c.name='Stationery & Office';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 11,'Business Envelopes','Stationery & Office','Envelopes',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Envelopes'),99,179,100,'Active',NULL,4.4,28,'45% OFF','Professional printed envelopes matching your brand identity.','["/products/11-front.svg","/products/11-back.svg"]','["White","Kraft"]','["DL","C5","C4"]','["100 GSM Paper","Full Color Print","Self-Seal","Window Option"]',1,'envelope',500
FROM categories c WHERE c.name='Stationery & Office';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 12,'Promotional Flyers','Marketing Materials','Flyers',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Flyers'),249,449,100,'Active','BEST SELLER',4.7,67,'44% OFF','Eye-catching flyers printed on high-quality paper for marketing campaigns.','["/products/12-front.svg","/products/12-back.svg"]','["Glossy","Matte"]','["A4","A5","DL"]','["170 GSM Art Paper","Full Color","Double Side","UV Coating Option"]',1,'flyer',700
FROM categories c WHERE c.name='Marketing Materials';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 13,'Corporate Brochures','Marketing Materials','Brochures',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Brochures'),399,699,100,'Active','PREMIUM',4.8,54,'43% OFF','Professional tri-fold and bi-fold brochures for your business.','["/products/13-front.svg","/products/13-back.svg"]','["Glossy","Matte","Silk"]','["A4 Tri-fold","A4 Bi-fold"]','["200 GSM Art Paper","Full Color","Fold Options","Lamination Available"]',1,'brochure',800
FROM categories c WHERE c.name='Marketing Materials';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 14,'Event Posters','Marketing Materials','Posters',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Posters'),179,299,100,'Active','NEW',4.5,38,'40% OFF','Large format posters for events, promotions and advertising.','["/products/14-front.svg","/products/14-back.svg"]','["Glossy","Matte"]','["A3","A2","A1"]','["150 GSM Paper","Vibrant Colors","Weather Resistant","Custom Sizes"]',1,'poster',450
FROM categories c WHERE c.name='Marketing Materials';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 15,'Product Labels','Stickers & Labels','Product Labels',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Product Labels'),149,279,100,'Active','POPULAR',4.6,82,'47% OFF','Custom printed product labels for branding and packaging.','["/products/15-front.svg","/products/15-back.svg"]','["Glossy","Matte","Transparent"]','["Small (2x2)","Medium (3x3)","Large (4x4)"]','["Waterproof","Strong Adhesive","Full Color","Die-Cut Available"]',1,'sticker',300
FROM categories c WHERE c.name='Stickers & Labels';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 16,'Vinyl Stickers','Stickers & Labels','Vinyl Stickers',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Vinyl Stickers'),199,349,100,'Active','BEST SELLER',4.7,95,'43% OFF','Durable vinyl stickers for indoor and outdoor use.','["/products/16-front.svg","/products/16-back.svg"]','["Vinyl Glossy","Vinyl Matte"]','["Custom Size","Sheet (A4)"]','["Weatherproof","UV Resistant","Custom Shape","Premium Vinyl"]',1,'sticker',250
FROM categories c WHERE c.name='Stickers & Labels';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 17,'Custom Paper Bags','Packaging','Paper Bags',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Paper Bags'),299,499,100,'Active','POPULAR',4.6,56,'40% OFF','Eco-friendly custom printed paper bags for retail and gifting.','["/products/17-front.svg","/products/17-back.svg"]','["Kraft","White Card"]','["Small","Medium","Large"]','["200 GSM Card","Custom Print","Rope Handle","Eco-Friendly"]',1,'paper-bag',900
FROM categories c WHERE c.name='Packaging';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 18,'Product Boxes','Packaging','Boxes',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Boxes'),399,649,100,'Active','PREMIUM',4.8,41,'39% OFF','Custom printed packaging boxes for products and gifts.','["/products/18-front.svg","/products/18-back.svg"]','["Corrugated","Card Board"]','["Small","Medium","Large","Custom"]','["Full Color Print","Custom Design","Strong Material","Food Safe Option"]',1,'box',1200
FROM categories c WHERE c.name='Packaging';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 19,'Custom Printed T-Shirts','Clothing & Bags','T-Shirts',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='T-Shirts'),349,599,100,'Active','BEST SELLER',4.7,112,'42% OFF','High-quality custom printed t-shirts for teams, events and branding.','["/products/19-front.svg","/products/19-back.svg"]','[]','["S","M","L","XL","XXL"]','["100% Cotton","DTG Printing","Custom Design","Bulk Discount"]',1,'tshirt',220
FROM categories c WHERE c.name='Clothing & Bags';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 20,'Branded Tote Bags','Clothing & Bags','Tote Bags',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Tote Bags'),199,349,100,'Active','NEW',4.5,67,'43% OFF','Eco-friendly custom printed tote bags for corporate and retail.','["/products/20-front.svg","/products/20-back.svg"]','[]','["Standard","Large"]','["Canvas Material","Full Color Print","Reusable","Eco-Friendly"]',1,'tote-bag',180
FROM categories c WHERE c.name='Clothing & Bags';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 21,'Embroidered Caps','Clothing & Bags','Caps',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Caps'),249,399,100,'Active',NULL,4.4,34,'38% OFF','Custom embroidered caps for teams, events and corporate branding.','["/products/21-front.svg","/products/21-back.svg"]','[]','["Free Size","Adjustable"]','["Cotton Twill","Embroidered Logo","Adjustable Strap","Multiple Colors"]',1,'cap',120
FROM categories c WHERE c.name='Clothing & Bags';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 22,'Custom Coffee Mugs','Mugs & Gifts','Coffee Mugs',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Coffee Mugs'),249,449,100,'Active','BEST SELLER',4.8,156,'44% OFF','Personalized coffee mugs with custom photo or design printing.','["/products/22-front.svg","/products/22-back.svg"]','[]','["11 oz","15 oz"]','["Ceramic Material","Dishwasher Safe","Full Wrap Print","Gift Box Available"]',1,'mug',450
FROM categories c WHERE c.name='Mugs & Gifts';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 23,'Photo Mugs','Mugs & Gifts','Photo Mugs',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Photo Mugs'),299,499,100,'Active','POPULAR',4.7,89,'40% OFF','Upload your favorite photo and get it printed on a premium ceramic mug.','["/products/23-front.svg","/products/23-back.svg"]','[]','["11 oz","15 oz","Magic Mug"]','["High Resolution Print","Fade Resistant","Microwave Safe","Custom Box"]',1,'mug',450
FROM categories c WHERE c.name='Mugs & Gifts';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 24,'Corporate Gift Sets','Mugs & Gifts','Corporate Gifts',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Corporate Gifts'),599,999,100,'Active','PREMIUM',4.9,45,'40% OFF','Premium corporate gift sets with custom branding for clients and employees.','["/products/24-front.svg","/products/24-back.svg"]','[]','["Standard Set","Premium Set"]','["Custom Branding","Premium Box","Multiple Items","Bulk Available"]',1,'giftset',1500
FROM categories c WHERE c.name='Mugs & Gifts';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 25,'Branded Ball Pens','Pens & Drinkware','Ball Pens',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Ball Pens'),49,89,100,'Active','POPULAR',4.3,210,'45% OFF','Custom printed ball pens for corporate gifting and promotional events.','["/products/25-front.svg","/products/25-back.svg"]','[]','["Standard"]','["Smooth Writing","Custom Print","Blue/Black Ink","Bulk Pricing"]',1,'pen',150
FROM categories c WHERE c.name='Pens & Drinkware';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 26,'Premium Metal Pens','Pens & Drinkware','Premium Pens',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Premium Pens'),199,349,100,'Active','PREMIUM',4.7,78,'43% OFF','Elegant metal pens with custom engraving for executive gifting.','["/products/26-front.svg","/products/26-back.svg"]','[]','["Standard","Slim"]','["Metal Body","Laser Engraving","Gift Box","Refillable"]',1,'pen',200
FROM categories c WHERE c.name='Pens & Drinkware';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 27,'Custom Water Bottles','Pens & Drinkware','Water Bottles',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Water Bottles'),349,599,100,'Active','NEW',4.6,56,'42% OFF','Stainless steel water bottles with custom branding for corporate use.','["/products/27-front.svg","/products/27-back.svg"]','[]','["500 ml","750 ml","1 Litre"]','["Stainless Steel","Double Wall","Custom Print","Leak Proof"]',1,'bottle',500
FROM categories c WHERE c.name='Pens & Drinkware';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 28,'Corporate Polo Shirts','Custom Polo T-Shirts','Corporate Polo',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Corporate Polo'),449,749,100,'Active','BEST SELLER',4.8,134,'40% OFF','Premium polo shirts with custom embroidery for corporate teams.','["/products/28-front.svg","/products/28-back.svg"]','[]','["S","M","L","XL","XXL"]','["Cotton Pique","Embroidered Logo","Collar Tipping","Multiple Colors"]',1,'tshirt',260
FROM categories c WHERE c.name='Custom Polo T-Shirts';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 29,'Printed Polo T-Shirts','Custom Polo T-Shirts','Printed Polo',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Printed Polo'),399,649,100,'Active','NEW',4.6,87,'39% OFF','Full color printed polo t-shirts for events and team wear.','["/products/29-front.svg","/products/29-back.svg"]','[]','["S","M","L","XL","XXL"]','["Poly-Cotton Blend","Sublimation Print","Breathable Fabric","Custom Design"]',1,'tshirt',260
FROM categories c WHERE c.name='Custom Polo T-Shirts';
INSERT IGNORE INTO products (id,name,category,subcategory,category_id,subcategory_id,price,old_price,stock,status,badge,rating,reviews,discount,description,images,paper_types,sizes,features,customizable,customization_type,weight_grams)
SELECT 30,'Event Custom T-Shirts','Custom Polo T-Shirts','Custom T-Shirts',c.id,(SELECT s.id FROM subcategories s WHERE s.category_id=c.id AND s.name='Custom T-Shirts'),299,499,100,'Active','POPULAR',4.5,198,'40% OFF','Affordable custom t-shirts for events, college fests and marathons.','["/products/30-front.svg","/products/30-back.svg"]','[]','["S","M","L","XL","XXL","3XL"]','["Round Neck","Screen Print","180 GSM Cotton","Bulk Discount"]',1,'tshirt',220
FROM categories c WHERE c.name='Custom Polo T-Shirts';

-- Coupons (shown in the offer bar; manage in Admin > Coupons)
INSERT IGNORE INTO coupons (code,type,value,min_order,valid_from,valid_to,active) VALUES
 ('SAVE5','percent',5,10000,'2026-01-01 00:00:00','2027-12-31 23:59:59',1),
 ('WELCOME10','percent',10,500,'2026-01-01 00:00:00','2027-12-31 23:59:59',1),
 ('PRINT100','flat',100,1500,'2026-01-01 00:00:00','2027-12-31 23:59:59',1);

-- Sample delivery pincodes (edit / add more in Admin > Delivery)
INSERT IGNORE INTO delivery_charges (pincode,city,state,charge,is_active) VALUES
 ('110001','New Delhi','Delhi',40,1),('110002','New Delhi','Delhi',40,1),('110003','New Delhi','Delhi',40,1),
 ('110005','New Delhi','Delhi',40,1),('110006','Delhi','Delhi',40,1),('110007','Delhi','Delhi',40,1),
 ('110009','Delhi','Delhi',40,1),('110016','New Delhi','Delhi',40,1),('110017','New Delhi','Delhi',40,1),
 ('110019','New Delhi','Delhi',40,1),('110024','New Delhi','Delhi',40,1),('110034','Delhi','Delhi',40,1),
 ('110045','New Delhi','Delhi',40,1),('110048','New Delhi','Delhi',40,1),('110058','New Delhi','Delhi',40,1),
 ('110085','Delhi','Delhi',40,1),('110092','Delhi','Delhi',40,1),('110096','Delhi','Delhi',40,1),
 ('122001','Gurugram','Haryana',70,1),('121001','Faridabad','Haryana',70,1),
 ('201301','Noida','Uttar Pradesh',70,1),('201001','Ghaziabad','Uttar Pradesh',70,1),
 ('400001','Mumbai','Maharashtra',120,1),('560001','Bengaluru','Karnataka',120,1),
 ('600001','Chennai','Tamil Nadu',120,1),('700001','Kolkata','West Bengal',120,1);

