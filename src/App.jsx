import { Routes, Route } from "react-router-dom";
import "./App.css";

import AppBar from "./app-components/AppBar";
import Footer from "./app-components/Footer";
import Home from "./app-components/Home";
import About from "./app-components/About";
import MonthlyCost from "./app-components/MonthlyCost";
import Recall from "./app-components/Recall"; // Keep import clear
import Reliability from "./app-components/Reliability";
import Login from "./app-components/Login";
import CommunityForums from "./app-components/CommunityForums";
import ForumThread from "./app-components/ForumThread";
import PostDetails from "./app-components/PostDetails";
import CommentDetails from "./app-components/CommentDetails";
import CreatePost from "./app-components/CreatePost";
import CreateComment from "./app-components/CreateComment";
import CarDetails from "./app-components/CarDetails";
import PrivacyPolicy from "./app-components/PrivacyPolicy";
import TermsOfService from "./app-components/TermsOfService";

function App() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:text-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      <AppBar />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/calculate" element={<MonthlyCost />} />
          <Route path="/recalls" element={<Recall />} /> {/* Standalone safety deck route */}
          <Route path="/reliability" element={<Reliability />} />
          <Route path="/forums" element={<CommunityForums />} />
          <Route path="/thread/:id" element={<ForumThread />} />
          <Route path="/post/:id" element={<PostDetails />} />
          <Route path="/comment/:id" element={<CommentDetails />} />
          <Route path="/createpost" element={<CreatePost />} />
          <Route path="/createcomment/:id" element={<CreateComment />} />
          <Route path="/login" element={<Login />} />
          <Route path="/car-details" element={<CarDetails />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default App;