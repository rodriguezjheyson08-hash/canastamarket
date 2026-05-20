-- Respaldo de productos - Mini Market
-- Fecha solicitada: 2026-05-20
-- Incluye tablas: categorias, productos

-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: licoreria_pos
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categorias`
--

LOCK TABLES `categorias` WRITE;
/*!40000 ALTER TABLE `categorias` DISABLE KEYS */;
INSERT INTO `categorias` VALUES (1,'Productos Higienicos','Papel, lava losa, aromatizador, etc'),(2,'Licores','cerveza, pisco, ron, etc'),(4,'Snacks','Galletas, chetos, piqueos, etc'),(11,'Embutidos','productos de cerdo, carne, etc'),(12,'lacteos','leche, yogurt, queso, etc'),(14,'Helados',NULL);
/*!40000 ALTER TABLE `categorias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `productos`
--

DROP TABLE IF EXISTS `productos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `productos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_general_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_general_ci,
  `precio_venta` decimal(10,2) NOT NULL,
  `precio_compra` decimal(10,2) DEFAULT NULL,
  `stock_actual` int NOT NULL DEFAULT '0',
  `stock_minimo` int NOT NULL DEFAULT '0',
  `categoria_id` int DEFAULT NULL,
  `imagen` mediumtext COLLATE utf8mb4_general_ci,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_productos_categoria` (`categoria_id`),
  CONSTRAINT `fk_productos_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `productos`
--

LOCK TABLES `productos` WRITE;
/*!40000 ALTER TABLE `productos` DISABLE KEYS */;
INSERT INTO `productos` VALUES (1,'SHAMPOO SEDAL',NULL,1.50,NULL,11,0,1,'https://th.bing.com/th/id/OIP.8tD83v3_Vmi2NWDkXEee_gHaHa?w=167&h=180&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',1,'2026-02-03 23:49:33','2026-02-15 21:32:32'),(3,'Cerveza trujillo','caja 65\nunidad 6',65.00,NULL,48,0,2,'https://th.bing.com/th/id/OIP.gQVOJIGEvMk8bY-dEqGJYwHaHa?w=201&h=201&c=7&r=0&o=7&dpr=1.3&pid=1.7&rm=3',1,'2026-02-08 22:02:12','2026-05-18 19:00:25'),(4,'Mesa 1 (Billar)','Servicio de mesa de billar',122.00,NULL,5,0,NULL,'https://cdn-icons-png.flaticon.com/512/2738/2738897.png',0,'2026-02-15 21:30:40','2026-05-18 19:55:27'),(6,'Four loco Purple',NULL,8.00,NULL,10,0,2,'https://tse4.mm.bing.net/th/id/OIP.RlpcAG-ZAHgMxnqwtt94rgHaJm?cb=defcachec2&rs=1&pid=ImgDetMain&o=7&rm=3',1,'2026-02-15 23:40:27','2026-03-14 15:41:43'),(7,'Kolynos',NULL,3.00,NULL,8,0,1,'https://boticasperu.pe/media/catalog/product/cache/eebfcecb9382e8d5ccf71e8b2c8cbd30/3/8/38563.jpg',1,'2026-02-16 00:15:09','2026-03-14 19:05:50'),(9,'Listerine',NULL,7.00,NULL,10,0,1,'https://static.beautytocare.com/cdn-cgi/image/width=1600,height=1600,f=auto/media/catalog/product//l/i/listerine-cool-mint-mild-taste-daily-mouthwash-500ml.jpg',1,'2026-02-16 00:18:57','2026-03-14 19:05:50'),(10,'SHAMPOO SEDAL',NULL,3.00,NULL,12,0,1,'https://cdn11.bigcommerce.com/s-3stx4pub31/images/stencil/1280x1280/products/9450/26194/sedal-shampoo-sachet-tratamiento__75205.1697660918.jpg?c=2?imbypass=on',1,'2026-02-16 00:23:38','2026-02-16 00:25:27'),(11,'Cuates',NULL,1.50,NULL,17,0,4,'data:image/webp;base64,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',1,'2026-02-16 00:31:29','2026-05-07 22:16:19'),(12,'Doritos',NULL,2.00,NULL,13,0,4,'https://th.bing.com/th/id/R.dbf4f6d1da91ff595eb4f71a09f62803?rik=POKkDLoZhXr3Xw&pid=ImgRaw&r=0',1,'2026-02-16 00:34:50','2026-05-12 06:07:30'),(13,'Galletas Animalitos',NULL,2.00,NULL,10,0,11,'https://candylandperu.com/wp-content/uploads/2023/02/Galletas-Animalitos-San-Jorge-Bolsa-1-Kg-1-57253134.webp',1,'2026-02-16 00:36:45','2026-05-21 16:39:06'),(14,'Cigarro',NULL,3.00,NULL,10,0,2,'https://img.freepik.com/psd-premium/maqueta-cajas-cigarrillos-tapa-abatible_1332-28015.jpg?w=2000',1,'2026-02-16 00:41:20','2026-04-13 17:11:09'),(15,'VINO BOTELLA 750 ML BERONIA CRIANZA',NULL,75.00,NULL,7,0,2,'https://rimage.ripley.com.pe/home.ripley/Attachment/MKP/4406/PMP20000721578/full_image-1.png',1,'2026-02-16 00:42:39','2026-02-16 00:42:39'),(16,'Cerveza Corona',NULL,8.00,NULL,20,0,2,'https://superxtrapanama.vtexassets.com/arquivos/ids/162943-1200-auto?v=637896282911630000&width=1200&height=auto&aspect=true',1,'2026-02-16 00:44:10','2026-05-15 16:39:34'),(17,'BLUE LABEL 750ML',NULL,700.00,NULL,5,0,2,'https://rimage.ripley.com.pe/home.ripley/Attachment/MKP/5225/PMP20001171493/full_image-1.webp',1,'2026-02-16 00:46:04','2026-02-16 00:46:04'),(19,'chupete',NULL,0.10,NULL,10,0,4,'https://tse2.mm.bing.net/th/id/OIP.Itvh9_eCI_v0vXePF0t75gHaJQ?rs=1&pid=ImgDetMain&o=7&rm=3',1,'2026-04-13 14:03:20','2026-05-15 16:41:49'),(22,'Helado sandwich',NULL,2.50,NULL,10,0,14,'https://th.bing.com/th/id/R.37d510bb72c7a906e8c903d207c4e200?rik=6xI5WCIAmrF9hw&riu=http%3a%2f%2fwww.recetario-cocina.com%2farchivosbd%2fsandwich-de-helado-casero-de-nata.jpg&ehk=NM10poOEIlkaV4vLEgSIPKVcpFsyX3%2f1nAKN1T%2b8cYA%3d&risl=&pid=ImgRaw&r=0',1,'2026-05-21 15:58:36','2026-05-21 15:58:36');
/*!40000 ALTER TABLE `productos` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed
