-- Remove old synthetic customer auth user (keeps admin user intact)
DELETE FROM auth.users WHERE email = '21964089478@deliveryapp.com';