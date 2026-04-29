-- Adds category (栏目) + workspace (草稿/客户讨论) dimension to topics.
-- category 留 text 类型方便后续扩展，不加 CHECK 约束。
-- workspace 默认 draft，新建/历史数据都先落在草稿区。

alter table topics
  add column if not exists category text,
  add column if not exists workspace text not null default 'draft';

-- 索引：栏目筛选 + workspace 切换是高频查询
create index if not exists topics_workspace_category_idx
  on topics(campaign_id, workspace, category)
  where deleted_at is null;
