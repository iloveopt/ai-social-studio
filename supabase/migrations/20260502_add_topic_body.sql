-- 帖子正文（出街文案）独立字段，跟 thinking（策划思考）解耦
-- thinking 是 agency 策略稿，body 是实际发出去的小红书正文

alter table topics
  add column if not exists body text;
