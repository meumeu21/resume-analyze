import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../css/main.css";
import "../css/ErrorPage.css";

type ErrorPageProps = {
  code: 404 | 500;
};

const MESSAGES: Record<number, { title: string; description: string }> = {
  404: {
    title: "Страница не найдена",
    description: "Такой страницы не существует или она была удалена.",
  },
  500: {
    title: "Ошибка сервера",
    description: "Что-то пошло не так. Попробуйте вернуться позже.",
  },
};

function ErrorPage({ code }: ErrorPageProps) {
  const { title, description } = MESSAGES[code];

  return (
    <>
      <Header />
      <div className="page container">
        <div className="error-page">
          <span className="error-page__code">{code}</span>
          <h1 className="error-page__title">{title}</h1>
          <p className="text error-page__description">{description}</p>
          <Link to="/" className="button text">На главную</Link>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default ErrorPage;
