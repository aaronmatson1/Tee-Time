-- Seed a few Utah courses on foreUP. Replace foreup_* IDs with real ones from the booking page network tab.
insert into public.courses (name, city, state, country, lat, lng, booking_platform, foreup_course_id, foreup_schedule_id, foreup_booking_class, booking_url) values
  ('Glenmoor Golf Club',       'South Jordan', 'UT', 'US', 40.5374, -111.9460, 'foreup', null, null, null, 'https://foreupsoftware.com/index.php/booking/'),
  ('Mountain Dell Golf Course','Salt Lake City','UT','US', 40.7644, -111.6760, 'foreup', null, null, null, 'https://foreupsoftware.com/index.php/booking/'),
  ('Bonneville Golf Course',   'Salt Lake City','UT','US', 40.7470, -111.8230, 'foreup', null, null, null, 'https://foreupsoftware.com/index.php/booking/'),
  ('Old Mill Golf Course',     'Holladay',     'UT','US', 40.6450, -111.8170, 'foreup', null, null, null, 'https://foreupsoftware.com/index.php/booking/')
on conflict do nothing;
