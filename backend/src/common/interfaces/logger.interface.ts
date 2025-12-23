export interface LogParams {
    motivo?: string;
    descripcion?: string;
    impacto?: string;
    tablaafectada?: string;
    usuarioID?: string;
    usuarioemail?: string;
}

export interface ILogger {
    agregarLog(params: LogParams): Promise<void>;
}
