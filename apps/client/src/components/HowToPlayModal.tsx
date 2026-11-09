import { useState } from 'react';
import { CAMEL_HEX, CAMEL_NAME_VI, RACING_CAMELS } from '@camelup/shared';
import { setShowRules, useStore } from '../store';
import { CamelIcon } from './CamelIcon';
import { BettingTentSvg, FinishArchSvg, PyramidSvg } from './DesertProps';

type TabId = 'overview' | 'stacking' | 'crazy' | 'actions' | 'scoring';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: '🎯 Tổng quan' },
  { id: 'stacking', label: '🐪 Xếp chồng & Hạng' },
  { id: 'crazy', label: '🎲 Lạc đà điên' },
  { id: 'actions', label: '⚡ Các hành động' },
  { id: 'scoring', label: '🏁 Tính điểm' },
];

export function HowToPlayModal() {
  const show = useStore((s) => s.showRules);
  const [tab, setTab] = useState<TabId>('overview');

  if (!show) return null;

  return (
    <div className="overlay rules-overlay" onClick={() => setShowRules(false)}>
      <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rules-header">
          <div>
            <h2>📖 Luật chơi Camel Up (Ấn bản 2nd Edition)</h2>
            <p className="muted small">Chuẩn theo sách luật chính thức · 2–8 người chơi</p>
          </div>
          <button className="btn small" onClick={() => setShowRules(false)}>
            ✕ Đóng
          </button>
        </div>

        <div className="rules-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`rules-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="rules-body">
          {tab === 'overview' && (
            <div className="rules-section">
              <div className="rule-callout">
                <strong>🏆 Mục tiêu trò chơi:</strong> Bạn vào vai các quý tộc Ai Cập đặt cược vào cuộc đua lạc đà
                quanh Kim tự tháp. Người kiếm được <strong>nhiều Đồng Bảng Ai Cập (EP - 💰) nhất</strong> khi cuộc đua
                kết thúc sẽ chiến thắng!
              </div>

              <div className="rule-grid-2">
                <div className="rule-card">
                  <h4>🐪 5 Lạc đà đua (Racing Camels)</h4>
                  <div className="rule-camel-row">
                    {RACING_CAMELS.map((c) => (
                      <div key={c} className="rule-camel-item">
                        <CamelIcon color={c} />
                        <small>{CAMEL_NAME_VI[c]}</small>
                      </div>
                    ))}
                  </div>
                  <ul>
                    <li>Xuất phát ngẫu nhiên tại các ô <strong>1, 2, 3</strong>.</li>
                    <li>
                      Chạy <strong>thuận chiều kim đồng hồ</strong> (từ ô 1 → 16 → qua Vạch đích).
                    </li>
                    <li>Mỗi con có 1 xúc xắc màu tương ứng với các mặt số <strong>1, 2, 3</strong>.</li>
                    <li>Chỉ 5 lạc đà đua mới được tính thứ hạng và đặt cược!</li>
                  </ul>
                </div>

                <div className="rule-card">
                  <h4>🌀 2 Lạc đà điên (Crazy Camels)</h4>
                  <div className="rule-camel-row">
                    {(['black', 'white'] as const).map((c) => (
                      <div key={c} className="rule-camel-item">
                        <CamelIcon color={c} flip />
                        <small>Điên {CAMEL_NAME_VI[c]}</small>
                      </div>
                    ))}
                  </div>
                  <ul>
                    <li>Xuất phát ở cuối bàn đua tại các ô <strong>14, 15, 16</strong>.</li>
                    <li>
                      Chạy <strong>ngược chiều kim đồng hồ</strong> (từ ô 16 → 15 → … → 1).
                    </li>
                    <li>Dùng chung <strong>1 xúc xắc Xám</strong> (3 mặt số Trắng 1–3 & 3 mặt số Đen 1–3).</li>
                    <li>
                      <strong>Không bao giờ được tính hạng</strong>, nhưng có thể cõng các lạc đà đua chạy lùi!
                    </li>
                  </ul>
                </div>
              </div>

              <div className="rule-card">
                <div className="rule-flex">
                  <PyramidSvg className="rule-illus-sm" />
                  <div>
                    <h4>🔺 Kim tự tháp & Cấu trúc một Chặng đua (Leg)</h4>
                    <ul>
                      <li>
                        Đầu mỗi chặng, cả <strong>6 viên xúc xắc</strong> (5 màu + 1 xám) được bỏ vào trong Kim tự tháp.
                      </li>
                      <li>
                        Mỗi lần có người chọn hành động lắc Kim tự tháp, <strong>1 viên xúc xắc ngẫu nhiên</strong> sẽ
                        rơi ra và đặt vào 1 trong <strong>5 Lều xúc xắc</strong> trên bàn.
                      </li>
                      <li>
                        Khi <strong>viên xúc xắc thứ 5</strong> được mở (tức là vẫn còn <strong>1 viên cuối cùng chưa mở</strong>{' '}
                        nằm lại trong Kim tự tháp), chặng đua hiện tại <strong>kết thúc ngay sau khi lạc đà di chuyển xong</strong>!
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'stacking' && (
            <div className="rules-section">
              <div className="rule-card">
                <h4>📚 1. Quy tắc "Cõng nhau theo cụm" (Camel Unit)</h4>
                <p>
                  Khi một con lạc đà di chuyển, nó sẽ <strong>cõng theo tất cả các con lạc đà đang ngồi phía trên lưng nó</strong>{' '}
                  cùng đi như một cụm. Những con lạc đà nằm <strong>bên dưới</strong> nó sẽ ở lại ô cũ.
                </p>
                <div className="rule-diagram">
                  <div className="diag-box">
                    <span className="diag-title">Trước khi đi (Ô 2)</span>
                    <div className="diag-stack">
                      <span className="diag-pill" style={{ background: CAMEL_HEX.green }}>3. Xanh lá (trên cùng)</span>
                      <span className="diag-pill" style={{ background: CAMEL_HEX.blue }}>2. Xanh dương (được lắc +2)</span>
                      <span className="diag-pill" style={{ background: CAMEL_HEX.red }}>1. Đỏ (dưới đáy)</span>
                    </div>
                  </div>
                  <div className="diag-arrow">🎲 Xanh dương +2 ➡️</div>
                  <div className="diag-box">
                    <span className="diag-title">Sau khi đi</span>
                    <p className="small" style={{ margin: 0 }}>
                      • <strong>Đỏ</strong> ở lại Ô 2.<br />• <strong>Xanh dương + Xanh lá</strong> cùng tiến tới Ô 4!
                    </p>
                  </div>
                </div>
              </div>

              <div className="rule-grid-2">
                <div className="rule-card">
                  <h4>⬆️ 2. Đáp xuống TRÊN ĐỈNH chồng</h4>
                  <p>
                    Thông thường (hoặc khi đạp trúng thẻ khán giả <strong>👏 Cổ vũ +1</strong>), khi một cụm lạc đà kết
                    thúc di chuyển ở một ô đã có lạc đà khác, cả cụm sẽ <strong>nhảy lên ngồi trên đỉnh</strong> của
                    chồng lạc đà tại ô đó.
                  </p>
                </div>

                <div className="rule-card">
                  <h4>⬇️ 3. Chui xuống DƯỚI ĐÁY chồng (Thẻ La ó −1)</h4>
                  <p>
                    Chỉ khi đạp trúng thẻ khán giả <strong>👎 La ó (−1)</strong>, cụm lạc đà bị lùi 1 ô và bắt buộc phải{' '}
                    <strong>chui xuống nằm dưới đáy</strong> của bất kỳ lạc đà nào đang có mặt ở ô lùi về!
                  </p>
                </div>
              </div>

              <div className="rule-card">
                <h4>🥇 4. Cách xác định Thứ hạng (Ranking)</h4>
                <ul>
                  <li>
                    <strong>Thứ tự trên đường đua:</strong> Lạc đà đua nào ở ô có số lớn hơn (gần vạch đích số 16 hơn)
                    thì xếp hạng cao hơn.
                  </li>
                  <li>
                    <strong>Thứ tự trong cùng một chồng:</strong> Trong cùng 1 ô, lạc đà nào <strong>ngồi ở vị trí cao hơn</strong>{' '}
                    thì xếp hạng trên con ở dưới (trên bàn đua có đánh số thứ tự từ <code>1</code> dưới đáy lên trên đỉnh).
                  </li>
                  <li>
                    <strong>Bỏ qua Lạc đà điên:</strong> Lạc đà Đen và Trắng không bao giờ được tính vào bảng xếp hạng
                    (dù chúng đang ở đầu hay đang ngồi trên lưng lạc đà đua).
                  </li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'crazy' && (
            <div className="rules-section">
              <div className="rule-callout">
                <strong>🎲 Xúc xắc Xám của Lạc đà điên (Trang 3 Sách Luật):</strong> Xúc xắc Xám có 3 mặt số màu{' '}
                <strong>Trắng (1, 2, 3)</strong> và 3 mặt số màu <strong>Đen (1, 2, 3)</strong>. Lạc đà điên luôn đi{' '}
                <strong>ngược chiều kim đồng hồ</strong> (lùi về số nhỏ hơn).
              </div>

              <div className="rule-card">
                <h4>⚠️ 2 Ngoại lệ BẮT BUỘC khi lắc ra Xúc xắc Xám</h4>
                <p>
                  Thông thường, xúc xắc Xám ra màu nào thì lạc đà điên màu đó di chuyển. Tuy nhiên, theo đúng sách luật,
                  bạn phải kiểm tra <strong>2 ngoại lệ ưu tiên</strong> sau đây trước:
                </p>
                <ol className="rule-list-numbered">
                  <li>
                    <strong>Ngoại lệ 1 — Ưu tiên con đang cõng lạc đà đua:</strong> Nếu <strong>chỉ có 1 trong 2</strong>{' '}
                    con lạc đà điên đang cõng ít nhất một lạc đà đua trên lưng, thì <strong>bắt buộc con lạc đà điên đó phải di chuyển</strong>,{' '}
                    bất kể mặt xúc xắc Xám ra màu Trắng hay Đen!
                    <br />
                    <small className="muted">
                      (Nếu cả 2 con điên đều đang cõng lạc đà đua, hoặc không con nào cõng lạc đà đua, thì xét tiếp quy
                      tắc dưới).
                    </small>
                  </li>
                  <li>
                    <strong>Ngoại lệ 2 — Hai con điên chồng trực tiếp lên nhau:</strong> Nếu một con lạc đà điên đang
                    ngồi <strong>trực tiếp trên lưng con lạc đà điên kia</strong> (không có lạc đà đua nào kẹp ở giữa),
                    thì <strong>bắt buộc con lạc đà điên ở trên phải di chuyển</strong>!
                  </li>
                </ol>
              </div>

              <div className="rule-card">
                <h4>🌀 Điều gì xảy ra nếu Lạc đà điên gặp Thẻ Khán giả hoặc Vạch đích?</h4>
                <ul>
                  <li>
                    <strong>Khi gặp Thẻ Khán giả:</strong> Vì hướng tiến của lạc đà điên là ngược chiều kim đồng hồ, nên{' '}
                    <strong>👏 Cổ vũ (+1)</strong> làm lạc đà điên đi tiếp 1 ô ngược chiều kim đồng hồ (nhảy lên đỉnh),
                    còn <strong>👎 La ó (−1)</strong> đẩy lạc đà điên lùi lại 1 ô theo chiều kim đồng hồ (chui xuống đáy).
                  </li>
                  <li>
                    <strong>Cõng lạc đà đua lùi qua Vạch đích (Trang 4 Sách Luật):</strong> Trong trường hợp hiếm gặp
                    khi lạc đà điên cõng lạc đà đua đi ngược chiều kim đồng hồ vượt qua vạch đích (từ ô 1 lùi qua vạch
                    đích), <strong>cuộc đua kết thúc ngay lập tức</strong> và những con lạc đà đua bị cõng qua đó được
                    tính là <strong>tụt hậu nhất (về bét)</strong>!
                  </li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'actions' && (
            <div className="rules-section">
              <p className="rule-intro">
                Khi tới lượt của mình, bạn thực hiện <strong>đúng 1 trong các hành động</strong> sau đây rồi chuyển lượt
                theo chiều kim đồng hồ:
              </p>

              <div className="rule-grid-2">
                <div className="rule-card">
                  <div className="rule-flex">
                    <BettingTentSvg className="rule-illus-xs" />
                    <h4>1. Lấy 1 Vé cược chặng</h4>
                  </div>
                  <ul>
                    <li>
                      Chọn 1 trong 5 màu lạc đà đua và lấy tấm vé trên cùng của chồng vé màu đó (giá trị lần lượt từ
                      trên xuống là <strong>5 → 3 → 2 → 2 EP</strong>).
                    </li>
                    <li>Bạn có thể giữ bao nhiêu vé cược chặng tùy ý.</li>
                    <li>
                      <strong>Khi kết thúc chặng:</strong>
                      <br />• Lạc đà trên vé đứng <strong>Hạng 1</strong>: Nhận <strong>+5, +3, hoặc +2 EP</strong> (in
                      trên vé).
                      <br />• Lạc đà trên vé đứng <strong>Hạng 2</strong>: Nhận <strong>+1 EP</strong>.
                      <br />• Lạc đà trên vé đứng <strong>Hạng 3, 4, hoặc 5</strong>: Bị phạt <strong>−1 EP</strong>.
                    </li>
                  </ul>
                </div>

                <div className="rule-card">
                  <div className="rule-flex">
                    <PyramidSvg className="rule-illus-xs" />
                    <h4>2. Lấy Vé Kim tự tháp & Lắc xúc xắc</h4>
                  </div>
                  <ul>
                    <li>
                      Bạn nhận <strong>1 Vé Kim tự tháp (🎫)</strong> đặt trước mặt (cuối chặng mỗi vé này mang lại
                      chắc chắn <strong>+1 EP</strong>).
                    </li>
                    <li>
                      Đồng thời lắc 1 viên xúc xắc từ Kim tự tháp và di chuyển lạc đà tương ứng.
                    </li>
                    <li>
                      Khi tấm vé Kim tự tháp thứ 5 được lấy và lạc đà dừng lại, chặng đua kết thúc!
                    </li>
                  </ul>
                </div>

                <div className="rule-card">
                  <h4>📣 3. Đặt hoặc Di chuyển Thẻ Khán giả</h4>
                  <ul>
                    <li>
                      Chọn mặt <strong>👏 Cổ vũ (+1, nhảy lên đỉnh)</strong> hoặc <strong>👎 La ó (−1, chui xuống đáy)</strong>.
                    </li>
                    <li>
                      Mỗi khi có cụm lạc đà dừng đúng ô có thẻ của bạn, bạn <strong>nhận ngay +1 EP</strong> từ ngân
                      hàng!
                    </li>
                    <li>
                      <strong>3 Điều kiện đặt thẻ:</strong>
                      <br />1. Ô đó phải trống (không có lạc đà và không có thẻ khán giả).
                      <br />2. <strong>Không bao giờ</strong> được đặt ở <strong>Ô số 1</strong>.
                      <br />3. <strong>Không được đặt sát cạnh</strong> một ô đã có thẻ khán giả của người chơi khác.
                    </li>
                    <li>
                      <em>Mẹo từ sách luật:</em> Nếu thẻ của bạn đã ở trên bàn đua, bạn có thể dùng hành động này để{' '}
                      <strong>di chuyển thẻ sang một ô hợp lệ khác</strong> (và chọn lại mặt thẻ)!
                    </li>
                  </ul>
                </div>

                <div className="rule-card">
                  <h4>🃏 4. Cược Chung cuộc (Về Nhất / Về Bét)</h4>
                  <ul>
                    <li>
                      Mỗi người chơi có <strong>5 Thẻ đích (Finish Cards)</strong> ứng với 5 màu lạc đà đua (mỗi thẻ chỉ
                      dùng được 1 lần trong cả ván).
                    </li>
                    <li>
                      Đặt úp bí mật 1 thẻ màu lên đỉnh chồng cược <strong>Về Nhất (🏆)</strong> hoặc{' '}
                      <strong>Về Bét (🐢)</strong> của cả cuộc đua.
                    </li>
                    <li>
                      <strong>Thưởng cuối trận (theo thứ tự đặt sớm → muộn):</strong>
                      <br />• Người đoán đúng thứ 1, 2, 3, 4, 5… nhận lần lượt: <strong>+8, +5, +3, +2, +1, +1… EP</strong>.
                      <br />• Mỗi thẻ đoán <strong>sai</strong> bị phạt <strong>−1 EP</strong>.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="rule-card">
                <h4>🤝 5. Liên minh cá cược (Chỉ áp dụng khi bàn có từ 6–8 người chơi · Trang 5 Sách Luật)</h4>
                <p>
                  Trong bàn từ 6–8 người chơi, bạn có thêm hành động thứ 5: Chọn 1 người chơi khác chưa có liên minh
                  trong chặng hiện tại để lập <strong>Liên minh cá cược</strong> (người được chọn không thể từ chối).
                  Khi tính điểm cuối chặng, cả hai người trong liên minh đều được nhận thêm{' '}
                  <strong>phần thưởng sao chép từ 1 tấm vé tốt nhất (vé cược chặng hoặc vé Kim tự tháp)</strong> của đối
                  tác! (Nếu đối tác chỉ toàn vé bị âm điểm thì không bị bắt buộc sao chép).
                </p>
              </div>
            </div>
          )}

          {tab === 'scoring' && (
            <div className="rules-section">
              <div className="rule-card">
                <h4>⏱️ 1. Khi Kết thúc một Chặng đua (End of a Leg)</h4>
                <p>
                  Xảy ra ngay khi <strong>viên xúc xắc thứ 5</strong> được lắc ra từ Kim tự tháp và lạc đà hoàn tất bước
                  di chuyển (mà chưa vượt qua vạch đích):
                </p>
                <ol className="rule-list-numbered">
                  <li>
                    <strong>Chuyển cờ Người đi đầu (🚩):</strong> Biểu tượng Người đi đầu chặng mới được trao cho{' '}
                    <strong>người chơi ngồi kế tiếp theo chiều kim đồng hồ</strong> của người vừa lắc viên xúc xắc thứ 5.
                  </li>
                  <li>
                    <strong>Tính tiền Chặng:</strong>
                    <br />• Mỗi <strong>Vé Kim tự tháp (🎫)</strong> nhận <strong>+1 EP</strong>.
                    <br />• Mỗi <strong>Vé cược chặng</strong> nhận <strong>+5/+3/+2 EP</strong> (nếu hạng 1),{' '}
                    <strong>+1 EP</strong> (nếu hạng 2), hoặc <strong>−1 EP</strong> (nếu hạng 3–5).
                    <br />• Nếu có <strong>Liên minh cá cược (6–8 người)</strong>: Cộng thêm phần thưởng cao nhất của 1
                    vé từ đối tác.
                    <br />• <em>Lưu ý quan trọng:</em> Số tiền của người chơi <strong>không bao giờ bị âm dưới 0 EP</strong>!
                  </li>
                  <li>
                    <strong>Dọn bàn cho chặng mới:</strong> Thu hồi tất cả vé cược chặng, vé Kim tự tháp, trả Thẻ Khán
                    giả về tay người chơi và bỏ lại cả 6 viên xúc xắc vào Kim tự tháp.
                  </li>
                </ol>
              </div>

              <div className="rule-card">
                <div className="rule-flex">
                  <FinishArchSvg className="rule-illus-sm" />
                  <div>
                    <h4>🏆 2. Khi Kết thúc Cuộc đua (End of the Game)</h4>
                    <ul>
                      <li>
                        Cuộc đua <strong>kết thúc ngay lập tức</strong> khi có bất kỳ cụm lạc đà nào có chứa lạc đà đua
                        vượt qua vạch đích!
                      </li>
                      <li>
                        <strong>Bước 1:</strong> Thực hiện tính điểm cho Chặng cuối cùng như bình thường.
                      </li>
                      <li>
                        <strong>Bước 2:</strong> Lật chồng thẻ cược <strong>Về Nhất chung cuộc</strong> và{' '}
                        <strong>Về Bét chung cuộc</strong> theo đúng thứ tự từ thẻ đặt sớm nhất tới thẻ đặt muộn nhất:
                        đoán đúng nhận <strong>+8, +5, +3, +2, +1, +1… EP</strong>; đoán sai bị trừ <strong>−1 EP</strong>.
                      </li>
                      <li>
                        <strong>Người chiến thắng:</strong> Người có tổng số Đồng Bảng Ai Cập (EP) cao nhất sẽ giành
                        chiến thắng! (Nếu hòa tiền thì cùng chia sẻ chiến thắng).
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
