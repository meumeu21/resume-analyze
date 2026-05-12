import Footer from "../components/Footer";
import Header from "../components/Header";
import TextField from "../components/TextField";

import "../css/Neuro.css"
import "../css/main.css"

function Neuro() { 
    return (
        <div>
            <Header />

            <div className="neuro-banner"></div>
            
            <div className="container">
                <div className="neuro-top-btns">
                    <a className="button text">Резюме</a>
                    <a className="button text">Рекомендации</a>
                </div>
                
                <div>
                    <h2>Рекомендации от нейросети</h2>
                    <button className="button text" type="button">Получить рекомендации</button>
                    <TextField title="Ответ CommIt.Neuro" text=""/>
                </div>

                <div>
                    <h2>Резюме</h2>
                    <div className="neuro-resume">
                        <div className="neuro-resume__left">
                            <TextField title="Резюме" text=""/>
                            <button className="button text" type="button">Переделай!</button>
                        </div>
                        <div className="neuro-resume__right">
                            <button className="button text" type="button">Скачать пустой шаблон</button>
                            <button className="button text" type="button">Скачать резюме</button>
                        </div>
                        
                    </div>
                </div>
            </div>
            

            <Footer/>
        </div>
        

    );
}

export default Neuro;