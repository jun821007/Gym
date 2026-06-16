export function GameHeader() {
  return (
    <header className="pixel-box pixel-box--gold mb-4 flex flex-wrap items-center justify-between gap-2 p-3">
      <div>
        <h1 className="text-[12px] leading-loose text-accent-gold">
          身體管理
        </h1>
        <p className="text-[8px] text-text-muted">BODY MANAGEMENT v0.1</p>
      </div>
      <div className="text-right text-[8px] text-text-muted">
        <p>◈ 勇者資訊</p>
        <p>◈ 地下城</p>
        <p>◈ 食堂</p>
      </div>
    </header>
  );
}
