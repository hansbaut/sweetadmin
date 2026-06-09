-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 09-06-2026 a las 08:30:34
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `sweetadmin`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `access_log`
--

CREATE TABLE `access_log` (
  `id` int(11) NOT NULL,
  `ip` varchar(255) DEFAULT NULL,
  `evento` enum('ingreso','salida') NOT NULL DEFAULT 'ingreso',
  `browser` varchar(255) DEFAULT NULL,
  `fecha_hora` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `usuarioId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `access_log`
--

INSERT INTO `access_log` (`id`, `ip`, `evento`, `browser`, `fecha_hora`, `usuarioId`) VALUES
(1, '::ffff:127.0.0.1', 'ingreso', 'Thunder Client (https://www.thunderclient.com)', '2026-06-07 15:49:45.260879', 1),
(2, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 16:52:27.159438', 1),
(3, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 16:55:14.982662', 1),
(4, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 16:56:40.387632', 1),
(5, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 20:10:44.596275', 1),
(6, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 20:15:24.774419', 1),
(7, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 20:16:57.075081', 1),
(8, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 20:21:24.273514', 1),
(9, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 20:24:52.610481', 1),
(10, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 20:28:43.935982', 1),
(11, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 20:34:32.522057', 1),
(12, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 21:02:32.858246', 1),
(13, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 21:10:23.275739', 1),
(14, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 21:10:41.699500', 1),
(15, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 21:12:06.281350', 1),
(16, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-07 22:53:50.401665', 1),
(17, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 22:38:15.569951', 1),
(18, '::1', 'ingreso', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-08 23:47:45.057757', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL,
  `nombre` varchar(50) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id`, `nombre`, `activo`) VALUES
(1, 'Panes', 1),
(2, 'Empanadas', 1),
(3, 'Pasteles y Postres', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

CREATE TABLE `pedidos` (
  `id` int(11) NOT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estado` enum('pendiente','en_proceso','listo','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `fecha` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `clienteId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `pedidos`
--

INSERT INTO `pedidos` (`id`, `total`, `estado`, `activo`, `fecha`, `clienteId`) VALUES
(1, 0.00, 'pendiente', 0, '2026-06-07 22:54:08.586848', 1),
(2, 45.50, 'entregado', 1, '2026-06-01 09:00:00.000000', 2),
(3, 150.00, 'entregado', 1, '2026-06-02 10:30:00.000000', 3),
(4, 28.00, 'entregado', 1, '2026-06-03 11:00:00.000000', 4),
(5, 75.00, 'entregado', 1, '2026-06-04 09:30:00.000000', 2),
(6, 22.00, 'entregado', 1, '2026-06-05 14:00:00.000000', 5),
(7, 350.00, 'entregado', 1, '2026-06-06 10:00:00.000000', 3),
(8, 36.50, 'listo', 1, '2026-06-07 08:00:00.000000', 4),
(9, 62.00, 'en_proceso', 1, '2026-06-08 11:30:00.000000', 2),
(10, 18.50, 'pendiente', 1, '2026-06-09 09:00:00.000000', 5),
(11, 45.00, 'pendiente', 1, '2026-06-09 10:00:00.000000', 3);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `precio` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `imagen` varchar(255) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6),
  `categoriaId` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `nombre`, `descripcion`, `precio`, `stock`, `imagen`, `activo`, `created_at`, `categoriaId`) VALUES
(1, 'Queque de chocolate', 'Queque esponjoso con cobertura de chocolate', 25.50, 10, NULL, 1, '2026-06-07 02:55:01.059037', NULL),
(2, 'Pan Batalla', 'Pan tradicional de batalla, suave y esponjoso', 1.50, 100, NULL, 1, '2026-06-07 21:02:16.363359', NULL),
(3, 'Pan Sarneta', 'Pan sarneta crujiente, típico paceño', 3.00, 80, NULL, 1, '2026-06-07 21:02:16.363359', NULL),
(4, 'Pan de Canela', 'Pan dulce con canela, ideal para el desayuno', 3.50, 60, NULL, 1, '2026-06-07 21:02:16.363359', NULL),
(5, 'Empanada de Queso', 'Empanada rellena de queso derretido, recién horneada', 5.00, 50, NULL, 1, '2026-06-07 21:02:16.363359', NULL),
(6, 'Empanada de Pollo', 'Empanada jugosa rellena de pollo con especias', 6.00, 50, NULL, 1, '2026-06-07 21:02:16.363359', NULL),
(7, 'Empanada de Carne', 'Empanada rellena de carne molida sazonada', 6.00, 50, NULL, 0, '2026-06-07 21:02:16.363359', NULL),
(8, 'Torta Tres Leches', 'Torta húmeda bañada en tres leches, tamaño personal', 15.00, 20, NULL, 1, '2026-06-07 21:02:16.363359', NULL),
(9, 'Salteña paceña', 'Empana tradicional de la ciudad de La Paz', 7.00, 25, NULL, 1, '2026-06-07 21:13:22.570257', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('admin','empleado','cliente') NOT NULL DEFAULT 'cliente',
  `fuerza_password` enum('debil','intermedio','fuerte') DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT current_timestamp(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `email`, `password`, `rol`, `fuerza_password`, `activo`, `created_at`) VALUES
(1, 'Mamá Admin', 'admin@sweetadmin.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'fuerte', 1, '2026-06-07 15:20:20.310899'),
(2, 'Carlos Mamani', 'carlos@sweetadmin.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'empleado', 'fuerte', 1, '2026-06-09 02:23:35.570282'),
(3, 'Ana Quispe', 'ana@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'cliente', 'intermedio', 1, '2026-06-09 02:23:35.570282'),
(4, 'Pedro Flores', 'pedro@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'cliente', 'fuerte', 1, '2026-06-09 02:23:35.570282'),
(5, 'Maria Condori', 'maria@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'cliente', 'debil', 1, '2026-06-09 02:23:35.570282'),
(6, 'Juan Huanca', 'juan@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'cliente', 'fuerte', 1, '2026-06-09 02:23:35.570282');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `access_log`
--
ALTER TABLE `access_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_7a33ec9f83eb8761164d7829a27` (`usuarioId`);

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_485346a40b61bb8ae3a98f5400c` (`clienteId`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `FK_aee00189e42dd8880cdfe1bb1e7` (`categoriaId`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_446adfc18b35418aac32ae0b7b` (`email`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `access_log`
--
ALTER TABLE `access_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `access_log`
--
ALTER TABLE `access_log`
  ADD CONSTRAINT `FK_7a33ec9f83eb8761164d7829a27` FOREIGN KEY (`usuarioId`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Filtros para la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD CONSTRAINT `FK_485346a40b61bb8ae3a98f5400c` FOREIGN KEY (`clienteId`) REFERENCES `usuarios` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `FK_aee00189e42dd8880cdfe1bb1e7` FOREIGN KEY (`categoriaId`) REFERENCES `categorias` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
