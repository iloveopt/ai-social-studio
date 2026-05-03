-- 封面真实宽高，瀑布流卡片靠这两个值算 aspect-ratio
-- 旧数据保持 NULL，前端回退到默认 3:4

alter table topics
  add column if not exists cover_width int,
  add column if not exists cover_height int;
