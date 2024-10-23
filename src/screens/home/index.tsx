import { useEffect, useRef, useState } from 'react';
import {SWATCHES} from '@/constants';
import styles from './index.module.css';
import { ColorSwatch, Group } from '@mantine/core';
import { Button } from '@/components/ui/button';
import Draggable from 'react-draggable';
import axios from 'axios';






interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

interface GeneratedResult {
    expression: string;
    answer: string;
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('rgb(255, 255, 255)');
    const [isEraserActive, setIsEraserActive] = useState(false);
    const [reset, setReset] = useState(false);
    const [result, setResult] = useState<GeneratedResult>();
    const [latexExpression, setLatexExpression] = useState<Array<string>>([]);
    const [latexPosition, setLatexPosition] = useState({ x: 10, y: 10 });
    const [dictOfVars, setDictOfVars] = useState({});
    const [strokeWidth, setStrokeWidth] = useState(3); // Default width

    









    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);


    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setResult(undefined);
            setDictOfVars({});
            setReset(false);
        }
    }, [reset]);



    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);



    useEffect(() => {
        const canvas = canvasRef.current;
    
        if (canvas) {
            canvas.style.background = '#0a0a0a';
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;    // 
                ctx.lineCap = 'round';
                ctx.lineWidth = 3;

                ctx.fillStyle = '#0a0a0a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML';
        script.async = true;
        document.head.appendChild(script);

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: {inlineMath: [['$', '$'], ['\\(', '\\)']]},
            });
        };

        return () => {
            document.head.removeChild(script);
        };

    }, []);


    
    const renderLatexToCanvas = (expression: string, answer: string) => {
        // Check if the expression is already wrapped in LaTeX delimiters
        let latex;
    
        if (expression.startsWith('\\(') || expression.startsWith('\\[')) {
            // Already a LaTeX expression
            latex = expression;
        } else {
            // Plain text or expression
            latex = `${expression} = ${answer}`;
        }
    
        setLatexExpression([...latexExpression, latex]);
    
        // Clear the main canvas
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };
    
    




    const sendData = async () => {
        const canvas = canvasRef.current;
    
        if (canvas) {
            console.log('Sending data...', `${import.meta.env.VITE_API_URL}/calculate`);
            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars
                }
            });
            const resp = await response.data;
            console.log('Response', resp);
            resp.data.forEach((data: Response) => {
                if (data.assign === true) {
                    // dict_of_vars[resp.result] = resp.answer;
                    setDictOfVars({
                        ...dictOfVars,
                        [data.expr]: data.result
                    });
                }
            });
            const ctx = canvas.getContext('2d');
            const imageData = ctx!.getImageData(0, 0, canvas.width, canvas.height);
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) {  // If pixel is not transparent
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            // const canvasRect = canvas.getBoundingClientRect();
            const centerX = (minX + maxX) / 2; // Calculate in canvas coordinate space
            const centerY = (minY + maxY) / 2;
            setLatexPosition({
                x: centerX, // + canvasRect.left, // Account for canvas position on the page
                y: centerY // + canvasRect.top

            });

            resp.data.forEach((data: Response) => {
                setTimeout(() => {
                    setResult({
                        expression: data.expr,
                        answer: data.result
                    });
                }, 1000);
            });
        }
    };




    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

        }
    };



    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                setIsDrawing(true);
            }
        }
    };


    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) {
            return;
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.lineWidth = strokeWidth; // Set line width to current stroke width
                ctx.strokeStyle = isEraserActive ? '#0a0a0a' : color;
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
                

            }
        }
    };
    
    
    
    
    const stopDrawing = () => {
        setIsDrawing(false);
    };  
    
    
    
    
    
    
    
    return (
        <>
            <div style={{ backgroundColor: '#0a0a0a'}}>
            <div style={{ backgroundColor: '#0a0a0a', overflow: 'hidden', width: '100vw', height: '100vh', }} 
            className='canvas-container'>  
            <div 
            style={{
                padding: '10px',
                backgroundColor: '#1a1a1a',
            }}
            className='flex flex-wrap justify-between items-center p-2'
            >
                <Button
                    onClick={() => setReset(true)}
                    className='z-20 bg-black text-white'
                    variant='default' 
                    color='black'
                    style={{ width: '100px', 
                        backgroundColor: '#f22929',
                        transition: 'background-color 0.3s ease, border-color 0.3s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ff1a1a')} // Hover effect
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#000000')} // Reset on leave

                >
                    Reset
                </Button>



                <Button
                    onClick={() => setIsEraserActive(true)}
                    className={`z-20 bg-black text-white eraserButton button ${styles.eraserButton} ${isEraserActive ? styles.active : ''}`} // Corrected className
                    variant='default'
                    color='white'
                    style={{  
                        
                        width: '50px',
                        height: '40px',
                        transition: 'background-color 0.3s ease, border-color 0.3s ease',
                        border: isEraserActive ? '2px solid #ff4136' : 'none',

                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ff6666')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isEraserActive ? '#ff4136' : '')}

                >
                    <img src="https://cdn-icons-png.flaticon.com/512/8352/8352687.png" alt="Eraser" width={30} height={30} />
                </Button>


                <Group style={{
                    
                }}
                className='z-20'>
                    {SWATCHES.map((swatchColor: string) => (
                        <ColorSwatch 
                            className={`swatch ${color === swatchColor ? 'active' : ''}`}
                            key={swatchColor} 
                            color={swatchColor}
                            style={{ width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                border: color === swatchColor ? '2px solid #007bff' : 'none', // Blue border if active
                                transform: color === swatchColor ? 'scale(1.1)' : 'scale(1)', // Slightly enlarge on hover

                            }} 
                            onClick={() => {
                                setColor(swatchColor);
                                setIsEraserActive(false);
                            }}
                        />
                    ))}
                </Group>

                <div 
                    style={{
                        borderColor: 'white',
                    }}
                    className='z-20 flex items-center'
                >
                    <img src="https://cdn-icons-png.flaticon.com/512/1158/1158132.png" alt="Brush" width={24} height={24} />
                    <input
                        type="range"
                        min={1}
                        max={50}
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(Number(e.target.value))}
                        className={`mx-2 cursor-pointer  ${styles.rangeInput} ${isEraserActive ? styles.red : styles.blue}`}
                        style={{ width: '150px',
                            background: isEraserActive ? '#ff4136' : '#007bff', 
                         }}
                    />
                    <span className='text-white'>{strokeWidth}px</span>
                </div>

                <Button
                    onClick={sendData}
                    className='z-20 bg-black text-white'
                    variant='default'
                    color='white'
                    style={{ width: '100px', 
                        backgroundColor: '#0ff245',
                        transition: 'background-color 0.3s ease, border-color 0.3s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#00ff2f')} // Hover effect
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#28a745')}
                >
                    Run
                </Button>
            </div>
            

            

            <canvas
                style={{
                  }}
                ref={canvasRef}
                id='canvas'
                className='absolute top-0 left-0 w-full h-full'
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
            />
                




            {latexExpression && latexExpression.map((latex, index) => (
                <Draggable
                    key={index}
                    onStop={(e, data) => setLatexPosition({ x: 10, y: 10})}
                >
                    <div style={{
                        maxWidth: '100vw',
                        width: '60vw'
                    }} className=" p-2 text-white rounded shadow-md">
                        {latex.startsWith('\\(') ? (
                            <div className="latex-content">{latex}</div>  // Render LaTeX
                        ) : (
                            <div>{latex}</div>  // Render plain text
                        )}
                    </div>
                </Draggable>
            ))}
            
            </div>
            </div>
        </>
    );
}
