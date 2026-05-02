export default function CampaignLoading() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      {/* 顶部导航栏骨架 */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="w-24 h-3.5 bg-gray-200 rounded animate-pulse" />
          <div className="w-16 h-2.5 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>

      {/* 标签栏骨架 */}
      <div className="bg-white px-4 py-2.5 flex gap-4 border-b border-gray-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-14 h-3 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>

      {/* 双列瀑布流骨架 */}
      <div className="flex-1 p-2.5 grid grid-cols-2 gap-2.5 items-start">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg overflow-hidden">
            <div
              className="bg-gray-200 animate-pulse"
              style={{ height: i % 2 === 0 ? 200 : 160 }}
            />
            <div className="p-2.5 space-y-2">
              <div className="w-full h-3 bg-gray-200 rounded animate-pulse" />
              <div className="w-2/3 h-3 bg-gray-100 rounded animate-pulse" />
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-gray-200 animate-pulse" />
                <div className="w-12 h-2.5 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
