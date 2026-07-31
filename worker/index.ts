// worker/index.ts
import type { Env } from "./shared/types";
import { getUserIdFromRequest, requireAuth } from "./middleware/auth";
import { authController } from "./controllers/authController";
import { userController } from "./controllers/userController";
import { commController } from "./controllers/commController";
import { r2Controller } from "./controllers/r2Controller";
import { testController } from "./controllers/testController";
import { adminController } from "./controllers/adminController";
import { paymentController } from "./controllers/paymentController";
import { showcaseController } from "./controllers/showcaseController";
import { customerController } from "./controllers/customerController";
import { bulletinController } from "./controllers/bulletinController"; 
import { inquiryController } from './controllers/inquiryController';
import { directInquiryController } from './controllers/directInquiryController';
import { notificationController } from "./controllers/notificationController";
import { userRelationController } from "./controllers/userRelationController";
import { ocController } from "./controllers/ocController"; 
import { calendarController } from "./controllers/calendarController";
import { reviewController } from "./controllers/reviewController";
import { announcementController } from "./controllers/announcementController";
import { feedbackController } from "./controllers/feedbackController";
import { guideController } from "./controllers/guideController";

export default {
  async fetch(request: any, env: Env, ctx: any): Promise<any> {
    const url = new URL(request.url);

    if (url.hostname === 'commission-app.pages.dev') {
      url.hostname = 'arti7.net';
      return Response.redirect(url.toString(), 301);
    }

    const sanitizedPath = url.pathname.replace(/\/$/, "");
    const pathParts = sanitizedPath.split("/");
    const requestOrigin = request.headers.get("Origin") || "";
    
    if (!sanitizedPath.startsWith("/api") && sanitizedPath.startsWith("/User_")) {
      const artistId = sanitizedPath.substring(1);
      
      const response = await env.ASSETS.fetch(request);
      let html = await response.text();

      try {
        const userRes = await userController.getUser(artistId, null, env, {});
        const userData = (await userRes.json()) as any;

        if (userData?.success && userData?.data) {
          const name = userData.data.display_name || "繪師頁面";
          
        
          html = html.replace(/<title>.*?<\/title>/si, `<title>Arti｜${name}</title>`);

          html = html.replace(/<meta property="og:title" content="[^"]*"/si, `<meta property="og:title" content="Arti｜${name}"`);
          
          console.log(`[SEO Injection] 成功為 ${artistId} 注入標題: ${name}`);
        }
      } catch (e) {
        console.error("[SEO Injection Error]", e);
      }
      
      return new Response(html, { 
        headers: { 
          "content-type": "text/html;charset=UTF-8",
          "Cache-Control": "public, max-age=3600"
        } 
      });
    }

    if (sanitizedPath === "/payment/result" && request.method === "POST") {
      const targetBase = env.FRONTEND_URL || url.origin;
      const redirectUrl = new URL("/artist/settings", targetBase);
      redirectUrl.searchParams.set("payment", "success");
      return Response.redirect(redirectUrl.toString(), 303);
    }

    if (!sanitizedPath.startsWith("/api")) {
      return env.ASSETS.fetch(request);
    }
    
    const allowedOrigins = [
      env.FRONTEND_URL, 
      "http://localhost:5173", 
      "https://commission-app.pages.dev",
      "https://cath-commission-manager.pages.dev",
      "https://arti7.net",
      "https://www.arti7.net"
    ];
    const safeOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : env.FRONTEND_URL || "";

    const corsHeaders = {
      "Access-Control-Allow-Origin": safeOrigin, 
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (sanitizedPath.startsWith("/api/")) {
      const currentUserId = await getUserIdFromRequest(request, env);

      if (sanitizedPath.startsWith("/api/notifications")) {
        const authErr = requireAuth(currentUserId, corsHeaders);
        if (authErr) return authErr;

        if (sanitizedPath === "/api/notifications" && request.method === "GET") {
          return notificationController.getNotifications(request, currentUserId!, env, corsHeaders);
        }
        if (sanitizedPath === "/api/notifications/read" && request.method === "POST") {
          return notificationController.markAsRead(request, currentUserId!, env, corsHeaders);
        }
      }

      if (sanitizedPath.startsWith("/api/relations")) {
        const authErr = requireAuth(currentUserId, corsHeaders);
        if (authErr) return authErr;

        if (sanitizedPath === "/api/relations/my-count" && request.method === "GET") {
          return userRelationController.getMyFavoriteCount(currentUserId!, env, corsHeaders);
        }

        if (sanitizedPath === "/api/relations" && request.method === "GET") {
          return userRelationController.getMyRelations(currentUserId!, env, corsHeaders);
        }

        if (sanitizedPath === "/api/relations" && request.method === "POST") {
          const { targetId, type, note } = await request.json();
          return userRelationController.upsertRelation(currentUserId!, targetId, type, note || '', env, corsHeaders);
        }

        if (sanitizedPath.startsWith("/api/relations/") && request.method === "DELETE") {
          const targetId = pathParts[3]; 
          return userRelationController.deleteRelation(currentUserId!, targetId, env, corsHeaders);
        }
      }

      if (sanitizedPath === "/api/announcements" && request.method === "GET") {
        return announcementController.getList(request, env, corsHeaders);
      }

      if (sanitizedPath === "/api/feedback" && request.method === "POST") {
        return feedbackController.submit(request, env, corsHeaders);
      }

      if (sanitizedPath === "/api/guide" && request.method === "GET") {
        return guideController.getPublic(env, corsHeaders);
      }

      if (sanitizedPath.startsWith("/api/bulletins")) {
        if (sanitizedPath === "/api/bulletins/quota" && request.method === "GET") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.getQuota(currentUserId!, env, corsHeaders);
        }
        if (sanitizedPath === "/api/bulletins/client/inbox" && request.method === "GET") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.getClientInbox(currentUserId!, env, corsHeaders);
        }
        if (sanitizedPath === "/api/bulletins/artist/inbox" && request.method === "GET") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.getArtistInbox(currentUserId!, env, corsHeaders);
        }

        const targetId = pathParts[3]; 
        const subAction = pathParts[4]; 

        if (!targetId) {
          if (request.method === "GET") return bulletinController.getList(request, env, corsHeaders);
          if (request.method === "POST") {
            const authErr = requireAuth(currentUserId, corsHeaders);
            if (authErr) return authErr;
            return bulletinController.create(request, currentUserId!, env, corsHeaders);
          }
        } else if (targetId && subAction === "inquire" && request.method === "POST") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.inquire(request, targetId, currentUserId!, env, corsHeaders);
        } else if (targetId && !subAction && request.method === "PATCH") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.update(request, targetId, currentUserId!, env, corsHeaders);
        } else if (targetId && subAction === "close" && request.method === "PATCH") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.closeBulletin(request, targetId, currentUserId!, env, corsHeaders);
        } 
        else if (targetId && subAction === "report" && request.method === "POST") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.reportBulletin(request, targetId, currentUserId!, env, corsHeaders);
        }
      }

      if (sanitizedPath.startsWith("/api/inquiries") && !sanitizedPath.startsWith("/api/direct-inquiries")) {
        const targetId = pathParts[3];
        const subAction = pathParts[4];

        if (targetId && subAction === "decline" && request.method === "POST") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.declineInquiry(request, targetId, currentUserId!, env, corsHeaders);
        }
        if (targetId && subAction === "submit-response" && request.method === "PATCH") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.submitResponse(request, targetId, currentUserId!, env, corsHeaders);
        }

        if (targetId && subAction === "messages") {
          if (request.method === "GET") {
            const authErr = requireAuth(currentUserId, corsHeaders);
            if (authErr) return authErr;
            return inquiryController.getMessages(targetId, currentUserId!, env, corsHeaders);
          }
          if (request.method === "POST") {
            const authErr = requireAuth(currentUserId, corsHeaders);
            if (authErr) return authErr;
            return inquiryController.sendMessage(request, targetId, currentUserId!, env, corsHeaders);
          }
        }
        if (targetId && subAction === "draft" && request.method === "PATCH") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return inquiryController.saveDraft(request, targetId, currentUserId!, env, corsHeaders);
        }
        if (targetId && subAction === "propose" && request.method === "POST") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return inquiryController.proposeAgreement(targetId, currentUserId!, env, corsHeaders);
        }
        if (targetId && subAction === "reject-proposal" && request.method === "POST") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return inquiryController.rejectProposal(targetId, currentUserId!, env, corsHeaders);
        }
        if (targetId && subAction === "finalize" && request.method === "POST") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return inquiryController.finalizeOrder(targetId, currentUserId!, env, corsHeaders);
        }
        
        if (targetId && !subAction && request.method === "GET") {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return inquiryController.getInquiryDetail(targetId, currentUserId!, env, corsHeaders);
        }        
      }

      if (sanitizedPath.startsWith("/api/direct-inquiries")) {
        const targetId = pathParts[3];
        const subAction = pathParts[4];

        if (!targetId && request.method === "POST") {
          return directInquiryController.submitOrder(request, currentUserId, env, corsHeaders);
        }

        const authErr = requireAuth(currentUserId, corsHeaders);
        if (authErr) return authErr;

        if (!targetId && request.method === "GET") return directInquiryController.getInboxList(currentUserId!, env, corsHeaders);
        
        if (targetId === "outbound" && request.method === "GET") return directInquiryController.getOutboundList(currentUserId!, env, corsHeaders);

        if (targetId && targetId !== "outbound") {
          if (!subAction && request.method === "GET") return directInquiryController.getDetail(targetId, currentUserId!, env, corsHeaders);
          if (subAction === "convert-free" && request.method === "POST") return directInquiryController.convertToFreeMode(targetId, currentUserId!, env, corsHeaders);
          if (subAction === "draft" && request.method === "PATCH") return directInquiryController.saveDraft(request, targetId, currentUserId!, env, corsHeaders);
          if (subAction === "propose" && request.method === "POST") return directInquiryController.proposeAgreement(targetId, currentUserId!, env, corsHeaders);
          if (subAction === "reject-proposal" && request.method === "POST") return directInquiryController.rejectProposal(targetId, currentUserId!, env, corsHeaders);
          if (subAction === "finalize" && request.method === "POST") return directInquiryController.finalizeOrder(targetId, currentUserId!, env, corsHeaders);
          if (subAction === "decline" && request.method === "POST") return directInquiryController.decline(request, targetId, currentUserId!, env, corsHeaders);
          
          if (subAction === "messages") {
            if (request.method === "GET") return directInquiryController.getMessages(targetId, currentUserId!, env, corsHeaders);
            if (request.method === "POST") return directInquiryController.sendMessage(request, targetId, currentUserId!, env, corsHeaders);
          }
        }
      }

      if (sanitizedPath.startsWith("/api/oc/share/")) {
        const ocId = pathParts[4];
        if (request.method === "GET" && ocId) return ocController.getShareById(ocId, env, corsHeaders);
      }

      if (sanitizedPath.startsWith("/api/oc")) {
        const authErr = requireAuth(currentUserId, corsHeaders);
        if (authErr) return authErr;
        
        const targetId = pathParts[3]; 

        if (!targetId) {
          if (request.method === "GET") return ocController.getList(currentUserId!, env, corsHeaders);
          if (request.method === "POST") return ocController.create(request, currentUserId!, env, corsHeaders);
        } else {
          if (request.method === "GET") return ocController.getDetail(targetId, currentUserId!, env, corsHeaders);
          if (request.method === "PATCH") return ocController.update(request, targetId, currentUserId!, env, corsHeaders);
          if (request.method === "DELETE") return ocController.delete(targetId, currentUserId!, env, corsHeaders);
        }
      }

      if (sanitizedPath.startsWith("/api/calendar-events")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        
        const targetId = pathParts[3]; 

        if (!targetId) {
          if (request.method === "GET") return calendarController.getEvents(currentUserId!, env, corsHeaders);
          if (request.method === "POST") return calendarController.createEvent(request, currentUserId!, env, corsHeaders);
        } else {
          if (request.method === "PUT" || request.method === "PATCH") {
            return calendarController.updateEvent(request, targetId, currentUserId!, env, corsHeaders);
          }
          if (request.method === "DELETE") {
            return calendarController.deleteEvent(targetId, currentUserId!, env, corsHeaders);
          }
        }
      }

      if (sanitizedPath.startsWith("/api/customers")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        const targetId = pathParts[3]; 
        const subAction = pathParts[4]; 

        if (!targetId) {
          if (request.method === "GET") return customerController.getList(currentUserId!, env, corsHeaders);
          if (request.method === "POST") return customerController.create(request, currentUserId!, env, corsHeaders);
        } else if (targetId && subAction === "history") {
          if (request.method === "GET") return customerController.getHistory(targetId, currentUserId!, env, corsHeaders);
        } else if (targetId && subAction === "reviews") {
          if (request.method === "GET") return reviewController.getCustomerReviews(targetId, currentUserId!, env, corsHeaders);
        } else {
          if (request.method === "GET") return customerController.getDetail(targetId, currentUserId!, env, corsHeaders);
          if (request.method === "PATCH") return customerController.update(request, targetId, currentUserId!, env, corsHeaders);
          if (request.method === "DELETE") return customerController.delete(targetId, currentUserId!, env, corsHeaders);
        }
      }

      if (sanitizedPath.startsWith("/api/reviews")) {
        const targetId = pathParts[3];
        const subAction = pathParts[4];

        if (targetId === "public" && pathParts[4]) {
          const artistId = pathParts[4];
          return reviewController.getPublicReviews(artistId, env, corsHeaders);
        }

        const authErr = requireAuth(currentUserId, corsHeaders);
        if (authErr) return authErr;

        if (!targetId && request.method === "POST") {
          return reviewController.create(request, currentUserId!, env, corsHeaders);
        }
        if (targetId === "artist" && request.method === "GET") {
          return reviewController.getArtistReviews(currentUserId!, env, corsHeaders);
        }
        if (targetId && subAction === "visibility" && request.method === "PATCH") {
          return reviewController.updateVisibility(request, targetId, currentUserId!, env, corsHeaders);
        }
      }

      if (sanitizedPath === "/api/payment/create" && request.method === "POST") {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        return paymentController.createOrder(request, currentUserId!, env, corsHeaders);
      }
      if (sanitizedPath === "/api/payment/notify" && request.method === "POST") {
        return paymentController.handleNotify(request, env);
      }

      if (request.method === "GET" && sanitizedPath === "/api/auth/line/login") return authController.login(request, env, corsHeaders);
      if (request.method === "GET" && sanitizedPath === "/api/auth/line/callback") return authController.callback(request, env, corsHeaders);
      if (request.method === "POST" && sanitizedPath === "/api/auth/logout") {
        return authController.logout(request, env, corsHeaders);
      }

      if (sanitizedPath.startsWith("/api/showcase")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        const targetId = pathParts[3];
        const subAction = pathParts[4];
        
        if (request.method === "GET" && !targetId) return showcaseController.getMyItems(currentUserId!, env, corsHeaders);
        if (request.method === "POST" && !targetId) return showcaseController.create(request, currentUserId!, env, corsHeaders);
        if (request.method === "PATCH" && targetId && !subAction) return showcaseController.update(request, targetId, currentUserId!, env, corsHeaders);
        if (request.method === "DELETE" && targetId && !subAction) return showcaseController.delete(targetId, currentUserId!, env, corsHeaders);
        if (request.method === "POST" && targetId && subAction === "reset-orders") return showcaseController.resetOrdersCount(targetId, currentUserId!, env, corsHeaders);
      }
      if (sanitizedPath.startsWith("/api/public/showcase/")) {
        const artistId = pathParts[4];
        return showcaseController.getPublicList(artistId, env, corsHeaders);
      }
      if (sanitizedPath.startsWith("/api/public/queue/")) {
        const artistId = pathParts[4];
        return commController.getPublicQueue(artistId, env, corsHeaders);
      }
      
      if (sanitizedPath.startsWith("/api/public/oc/")) {
        const userId = pathParts[4];
        return ocController.getPublicList(userId, env, corsHeaders);
      }

      if (sanitizedPath === "/api/queue/snapshot" && request.method === "POST") {
        const authErr = requireAuth(currentUserId, corsHeaders);
        if (authErr) return authErr;
        return commController.publishSnapshot(request, currentUserId!, env, corsHeaders);
      }

      if (sanitizedPath.startsWith("/api/admin/")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        
        if (request.method === "GET" && sanitizedPath === "/api/admin/stats") return adminController.getDashboardStats(currentUserId!, env, corsHeaders);
        // 一次性維護端點：跑完可移除
        if (request.method === "POST" && sanitizedPath === "/api/admin/campaign/wishboard-reactivation") return adminController.createWishboardReactivationCampaign(currentUserId!, env, corsHeaders);
        if (request.method === "GET" && sanitizedPath === "/api/admin/users") return adminController.getUsers(request, currentUserId!, env, corsHeaders);
        if (request.method === "GET" && sanitizedPath === "/api/admin/commissions") return adminController.getCommissions(request, currentUserId!, env, corsHeaders);
        
        if (request.method === "PATCH" && pathParts[3] === "users" && pathParts.length === 5) {
          return adminController.updateUser(request, pathParts[4], currentUserId!, env, corsHeaders);
        }

        if (pathParts[3] === "keywords") {
          if (request.method === "GET" && !pathParts[4]) return adminController.getKeywords(currentUserId!, env, corsHeaders);
          if (request.method === "POST" && !pathParts[4]) return adminController.addKeyword(request, currentUserId!, env, corsHeaders);
          if (request.method === "DELETE" && pathParts[4]) return adminController.deleteKeyword(pathParts[4], currentUserId!, env, corsHeaders);
        }

        if (pathParts[3] === "feedback") {
          if (request.method === "GET" && !pathParts[4]) {
            return feedbackController.getList(request, currentUserId!, env, corsHeaders);
          }
          if (request.method === "PATCH" && pathParts[4] && pathParts[5] === "read") {
            return feedbackController.markRead(pathParts[4], currentUserId!, env, corsHeaders);
          }
        }

        if (pathParts[3] === "announcements") {
          if (request.method === "GET" && !pathParts[4]) {
            return announcementController.getAdminList(currentUserId!, env, corsHeaders);
          }
          if (request.method === "POST" && !pathParts[4]) {
            return announcementController.create(request, currentUserId!, env, corsHeaders);
          }
          if (request.method === "PATCH" && pathParts[4]) {
            return announcementController.update(request, pathParts[4], currentUserId!, env, corsHeaders);
          }
          if (request.method === "DELETE" && pathParts[4]) {
            return announcementController.delete(pathParts[4], currentUserId!, env, corsHeaders);
          }
        }

        if (pathParts[3] === "guide") {
          if (pathParts[4] === "sections") {
            if (request.method === "POST" && !pathParts[5]) return guideController.createSection(request, currentUserId!, env, corsHeaders);
            if (request.method === "PATCH" && pathParts[5]) return guideController.updateSection(request, pathParts[5], currentUserId!, env, corsHeaders);
            if (request.method === "DELETE" && pathParts[5]) return guideController.deleteSection(pathParts[5], currentUserId!, env, corsHeaders);
          }
          if (pathParts[4] === "steps") {
            if (request.method === "POST" && !pathParts[5]) return guideController.addStep(request, currentUserId!, env, corsHeaders);
            if (request.method === "PATCH" && pathParts[5] && pathParts[6] === "order") return guideController.reorderStep(request, pathParts[5], currentUserId!, env, corsHeaders);
            if (request.method === "PATCH" && pathParts[5] && !pathParts[6]) return guideController.updateStep(request, pathParts[5], currentUserId!, env, corsHeaders);
            if (request.method === "DELETE" && pathParts[5]) return guideController.deleteStep(pathParts[5], currentUserId!, env, corsHeaders);
          }
        }

        if (pathParts[3] === "wishboard") {
          if (request.method === "GET" && pathParts[4] === "reported") return adminController.getReportedBulletins(request, currentUserId!, env, corsHeaders);
          if (request.method === "GET" && pathParts[4] && pathParts[5] === "reports") {
            return adminController.getBulletinReports(request, pathParts[4], currentUserId!, env, corsHeaders);
          }
          if (request.method === "PATCH" && pathParts[4] && pathParts[5] === "status") {
            return adminController.updateBulletinStatus(request, pathParts[4], currentUserId!, env, corsHeaders);
          }
        }
      }

      if (sanitizedPath.startsWith("/api/users/")) {
        const targetId = pathParts[3];

        if (request.method === "GET" && sanitizedPath.endsWith("/wishboard-campaign")) {
          const authErr = requireAuth(currentUserId, corsHeaders);
          if (authErr) return authErr;
          return bulletinController.getWishboardCampaignOffers(request, currentUserId!, env, corsHeaders);
        }

        if (request.method === "GET") return userController.getUser(targetId, currentUserId, env, corsHeaders);

        const authErr = requireAuth(currentUserId, corsHeaders);
        if (authErr) return authErr;

        if (request.method === "PATCH") return userController.updateUser(request, targetId, currentUserId!, env, corsHeaders);
        if (request.method === "DELETE" && targetId === "me") return userController.deleteUser(currentUserId!, env, corsHeaders);
        if (request.method === "POST" && sanitizedPath.endsWith("/complete-onboarding")) return userController.completeOnboarding(request, currentUserId!, env, corsHeaders);
        if (request.method === "POST" && sanitizedPath.endsWith("/upgrade")) return userController.upgradeToArtist(currentUserId!, env, corsHeaders);
        if (request.method === "POST" && sanitizedPath.endsWith("/wishboard-campaign/respond")) return bulletinController.respondWishboardCampaign(request, currentUserId!, env, corsHeaders);
      }

      if (sanitizedPath.startsWith("/api/commissions")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        const targetId = pathParts[3]; 
        const subAction = pathParts[4]; 
        if (!targetId) {
          if (request.method === "GET") return commController.getList(currentUserId!, env, corsHeaders);
          if (request.method === "POST") return commController.create(request, currentUserId!, env, corsHeaders);
        } else if (targetId && !subAction) {
          if (request.method === "GET") return commController.getDetail(targetId, currentUserId!, env, corsHeaders);
          if (request.method === "PATCH") return commController.update(request, targetId, currentUserId, env, corsHeaders);
        } else if (targetId && subAction) {
          switch (subAction) {
            case "deliverables":
            case "submissions":
            case "logs":
              return commController.getDeliverables(targetId, subAction, currentUserId!, env, corsHeaders);
            case "submit":
              if (request.method === "POST") return commController.submitArtwork(request, targetId, currentUserId!, env, corsHeaders);
              break;
            case "review":
              if (request.method === "POST") return commController.reviewArtwork(request, targetId, currentUserId!, env, corsHeaders);
              break;
            case "change-request":
              if (request.method === "POST") return commController.changeRequest(request, targetId, currentUserId!, env, corsHeaders);
              break;
            case "change-response":
              if (request.method === "POST") return commController.respondToChange(request, targetId, currentUserId!, env, corsHeaders);
              break;
            case "payments":
              if (request.method === "GET") return commController.getPayments(targetId, currentUserId!, env, corsHeaders);
              if (request.method === "POST") return commController.postPayment(request, targetId, currentUserId!, env, corsHeaders);
              if (request.method === "DELETE" && pathParts[5]) return commController.deletePayment(pathParts[5], currentUserId!, env, corsHeaders);
              break;
            case "messages":
              if (request.method === "GET") return commController.getMessages(targetId, currentUserId!, env, corsHeaders);
              if (request.method === "POST") return commController.postMessage(request, targetId, currentUserId!, env, corsHeaders);
              break;
          }
        }
      }

      if (sanitizedPath.startsWith("/api/r2/")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        if (request.method === "POST" && sanitizedPath.endsWith("/upload-url")) return r2Controller.getUploadUrl(request, currentUserId!, env, corsHeaders);
        if (request.method === "POST" && sanitizedPath.endsWith("/download-url")) return r2Controller.getDownloadUrl(request, currentUserId!, env, corsHeaders);
      }
      if (sanitizedPath.startsWith("/api/test/")) {
        const authErr = requireAuth(currentUserId, corsHeaders); 
        if (authErr) return authErr;
        if (request.method === "POST" && sanitizedPath.endsWith("/start-trial")) return testController.startTrial(currentUserId!, env, corsHeaders);
        if (request.method === "POST" && sanitizedPath.endsWith("/mock-upgrade")) return testController.mockUpgrade(currentUserId!, env, corsHeaders);
      }

      return new Response(JSON.stringify({ success: false, error: "API Route Not Found" }), { status: 404, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: false, error: "Malformed System Routing" }), { status: 400, headers: corsHeaders });
  }
};