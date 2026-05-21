import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

async function runTests() {
  console.log("=== BẮT ĐẦU KIỂM TRA HỆ THỐNG EMAIL ===");

  const TEST_USERNAME = "test_mail_user_" + Date.now();
  const ADMIN_USERNAME = "admin_mail_user_" + Date.now();

  try {
    // 1. Tạo tài khoản người chơi test (NORMAL)
    console.log(`\n1. Tạo người chơi test: ${TEST_USERNAME}`);
    const normalUser = await db.user.create({
      data: {
        username: TEST_USERNAME,
        displayName: "Test Normal User",
        password: hashPassword("12345"),
        role: "NORMAL"
      }
    });

    // 2. Tạo tài khoản admin test (ADMIN)
    console.log(`2. Tạo admin test: ${ADMIN_USERNAME}`);
    const adminUser = await db.user.create({
      data: {
        username: ADMIN_USERNAME,
        displayName: "Test Admin User",
        password: hashPassword("12345"),
        role: "ADMIN"
      }
    });

    // 3. Khởi tạo GameState mẫu cho người chơi test (Giả lập initializeUserSaveGame)
    console.log(`3. Khởi tạo GameState và nhân bản Email mẫu cho ${TEST_USERNAME}...`);
    // Lấy các team mẫu
    const templateTeam = await db.team.findFirst({
      where: { userId: null }
    });
    if (!templateTeam) throw new Error("Không tìm thấy team mẫu trong db.");

    // Tạo GameState cho user
    await db.gameState.create({
      data: {
        currentDate: "2026-01-05",
        userTeamId: templateTeam.id,
        seasonState: "FIRST_STAND_QF",
        week: 1,
        dayOfSeason: 1,
        userId: normalUser.id
      }
    });

    // Nhân bản email mẫu (tương đương với logic mới viết trong initializeUserSaveGame)
    const templateMails = await db.mail.findMany({
      where: { userId: null }
    });
    console.log(`Tìm thấy ${templateMails.length} email mẫu trong database.`);

    for (const tm of templateMails) {
      await db.mail.create({
        data: {
          title: tm.title,
          content: tm.content,
          date: tm.date,
          sender: tm.sender,
          category: tm.category,
          read: false,
          userId: normalUser.id
        }
      });
    }

    // Kiểm tra xem user đã có email chào mừng chưa
    const userMailsAfterInit = await db.mail.findMany({
      where: { userId: normalUser.id }
    });
    console.log(`Số lượng email của ${TEST_USERNAME} sau khởi tạo: ${userMailsAfterInit.length}`);
    const welcomeMail = userMailsAfterInit.find(m => m.title.includes("Chào mừng"));
    if (welcomeMail) {
      console.log(`  -> Thành công: Đã tìm thấy thư chào mừng nhân bản! ID: ${welcomeMail.id}, Read: ${welcomeMail.read}`);
    } else {
      throw new Error("Không tìm thấy thư chào mừng của user.");
    }

    // 4. Kiểm tra việc cập nhật trạng thái đã đọc (Read Status)
    console.log(`\n4. Đánh dấu đã đọc thư chào mừng của ${TEST_USERNAME}...`);
    // Kiểm tra kiểm soát quyền như trong readMailAction
    const mailToRead = await db.mail.findUnique({
      where: { id: welcomeMail.id }
    });
    if (!mailToRead || mailToRead.userId !== normalUser.id) {
      throw new Error("Không tìm thấy thư hoặc sai quyền sở hữu!");
    }

    await db.mail.update({
      where: { id: welcomeMail.id },
      data: { read: true }
    });

    const updatedMail = await db.mail.findUnique({
      where: { id: welcomeMail.id }
    });
    console.log(`  -> Trạng thái đã đọc sau khi cập nhật: ${updatedMail?.read}`);
    if (updatedMail?.read === true) {
      console.log("  -> Thành công: Trạng thái đọc được lưu vào DB!");
    } else {
      throw new Error("Không lưu được trạng thái đọc!");
    }

    // 5. Thử nghiệm tính năng Gửi thư toàn Server (Admin Global Mail)
    console.log(`\n5. Admin gửi thư toàn máy chủ...`);
    const globalTitle = "Thông báo khẩn: Bảo trì hệ thống!";
    const globalContent = "Hệ thống sẽ bảo trì từ 23:00 đến 24:00 hôm nay.";
    const globalSender = "Hệ Thống Admin";

    // Thực hiện logic gửi thư toàn server
    const allUsers = await db.user.findMany({
      include: { gameState: true }
    });
    console.log(`Gửi thư cho tất cả ${allUsers.length} tài khoản trong hệ thống...`);

    for (const u of allUsers) {
      const date = u.gameState?.currentDate || "2026-01-05";
      await db.mail.create({
        data: {
          title: globalTitle,
          content: globalContent,
          date,
          sender: globalSender,
          category: "GENERAL",
          read: false,
          userId: u.id
        }
      });
    }

    // Lưu thư làm mẫu (userId: null) cho các tài khoản đăng ký mới sau này
    await db.mail.create({
      data: {
        title: globalTitle,
        content: globalContent,
        date: "2026-01-05",
        sender: globalSender,
        category: "GENERAL",
        read: false,
        userId: null
      }
    });

    console.log("Đã gửi thư toàn server hoàn tất.");

    // Kiểm tra xem các người chơi đã nhận được thư chưa
    const checkNormalUserMail = await db.mail.findFirst({
      where: { userId: normalUser.id, title: globalTitle }
    });
    const checkAdminUserMail = await db.mail.findFirst({
      where: { userId: adminUser.id, title: globalTitle }
    });
    const checkGlobalTemplateMail = await db.mail.findFirst({
      where: { userId: null, title: globalTitle }
    });

    console.log(`Kiểm tra kết quả nhận thư:`);
    console.log(`  - Người chơi thường nhận được: ${!!checkNormalUserMail} (ID: ${checkNormalUserMail?.id})`);
    console.log(`  - Tài khoản Admin nhận được: ${!!checkAdminUserMail} (ID: ${checkAdminUserMail?.id})`);
    console.log(`  - Global Template được tạo: ${!!checkGlobalTemplateMail} (ID: ${checkGlobalTemplateMail?.id})`);

    if (checkNormalUserMail && checkAdminUserMail && checkGlobalTemplateMail) {
      console.log("  -> Thành công: Tất cả tài khoản nhận được email và email được lưu làm template!");
    } else {
      throw new Error("Có tài khoản không nhận được email!");
    }

    // 6. Dọn dẹp dữ liệu test
    console.log(`\n6. Dọn dẹp dữ liệu test...`);
    // Xóa email của test users và template test
    await db.mail.deleteMany({
      where: {
        OR: [
          { userId: normalUser.id },
          { userId: adminUser.id },
          { id: checkGlobalTemplateMail.id }
        ]
      }
    });

    // Xóa GameState của test user
    await db.gameState.deleteMany({
      where: { userId: normalUser.id }
    });

    // Xóa test users
    await db.user.delete({ where: { id: normalUser.id } });
    await db.user.delete({ where: { id: adminUser.id } });

    console.log("=== ĐÃ DỌN DẸP XONG ===");
    console.log("=== TẤT CẢ KIỂM TRA ĐỀU THÀNH CÔNG ===");
  } catch (error: any) {
    console.error("LỖI KIỂM TRA:", error);
    // Cố gắng dọn dẹp tối đa nếu lỗi xảy ra giữa chừng
    try {
      const u1 = await db.user.findUnique({ where: { username: TEST_USERNAME } });
      const u2 = await db.user.findUnique({ where: { username: ADMIN_USERNAME } });
      if (u1) {
        await db.mail.deleteMany({ where: { userId: u1.id } });
        await db.gameState.deleteMany({ where: { userId: u1.id } });
        await db.user.delete({ where: { id: u1.id } });
      }
      if (u2) {
        await db.mail.deleteMany({ where: { userId: u2.id } });
        await db.user.delete({ where: { id: u2.id } });
      }
      const badTemplate = await db.mail.findFirst({ where: { userId: null, title: "Thông báo khẩn: Bảo trì hệ thống!" } });
      if (badTemplate) await db.mail.delete({ where: { id: badTemplate.id } });
      console.log("Đã dọn dẹp sau khi lỗi.");
    } catch (cleanError) {
      console.error("Lỗi khi cố gắng dọn dẹp:", cleanError);
    }
  }
}

runTests();
