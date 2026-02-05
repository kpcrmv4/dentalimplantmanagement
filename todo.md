# DentalStock Management System - TODO

## Core Features
- [x] Login system with Supabase Auth
- [x] Dashboard with calendar and summary cards
- [x] Case management (CRUD operations)
- [x] Patient management
- [x] Inventory management with LOT tracking
- [x] Material reservation system (restricted to Dentists only)
- [x] Purchase orders
- [x] Transfers/exchanges with suppliers
- [x] Reports and statistics
- [x] Settings (clinic, suppliers, categories, users)
- [x] Audit log system
- [x] Notifications page

## Database
- [x] Complete database schema (17 tables, 7 views, 9 functions, 20+ triggers)
- [x] RLS policies for access control
- [x] Fix RLS policies SQL script

## Case Status Color System
- [x] 🟢 Green: Ready for surgery (materials prepared)
- [x] 🟡 Yellow: Waiting for materials (ordered but not arrived)
- [x] 🔴 Red: Insufficient stock (urgent action needed)
- [x] ⚪ Gray: Case created but no materials reserved yet

## Deployment
- [x] Push code to GitHub
- [x] Deploy to Vercel
- [x] Configure Supabase environment variables

## Fixes Applied
- [x] Fixed Suspense boundary issue on login page
- [x] Added notifications page (was 404)
- [x] Fixed notifications page data mapping (was showing undefined)
- [x] Fixed audit-logs page layout (padding/margin consistency)
- [x] Created fix_rls_policies.sql for RLS issues
- [x] Fixed inventory/receive page layout (padding/margin consistency)
- [x] Fixed products/new page layout (padding/margin consistency)
- [x] Added sort buttons to inventory table headers
